import assert from 'node:assert/strict';

import {
  parseGatewayServerMessage,
  type GatewayServerMessage
} from '@market-tracker/contracts';

import { buildStreamGatewayApp } from './gateway-app';

const waitForMessage = async (
  socket: WebSocket,
  predicate: (message: GatewayServerMessage) => boolean
): Promise<GatewayServerMessage> => {
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for WebSocket message.'));
    }, 8_000);

    const handler = (event: MessageEvent<string>) => {
      const parsed = parseGatewayServerMessage(JSON.parse(event.data));
      if (predicate(parsed)) {
        clearTimeout(timeout);
        socket.removeEventListener('message', handler);
        resolve(parsed);
      }
    };

    socket.addEventListener('message', handler);
  });
};

const run = async (): Promise<void> => {
  const app = await buildStreamGatewayApp({
    heartbeatIntervalMs: 20_000,
    clientTimeoutMs: 40_000
  });

  await app.listen({ host: '127.0.0.1', port: 0 });

  try {
    const address = app.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected numeric server address.');
    }

    const healthResponse = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(healthResponse.status, 200);

    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener('error', (error) => reject(error), { once: true });
    });

    const welcome = await waitForMessage(socket, (message) => message.type === 'welcome');
    assert.equal(welcome.type, 'welcome');

    socket.send(JSON.stringify({ type: 'subscribe', symbols: ['AAPL'] }));

    const subscriptions = await waitForMessage(socket, (message) => message.type === 'subscriptions.updated');
    assert.deepEqual(subscriptions.type === 'subscriptions.updated' ? subscriptions.symbols : [], ['AAPL']);

    const streamEvent = await waitForMessage(
      socket,
      (message) =>
        message.type === 'stream.event' &&
        (message.event.type === 'quote.updated' ||
          message.event.type === 'trade.printed' ||
          message.event.type === 'bar.closed')
    );

    assert.equal(streamEvent.type, 'stream.event');
    if (streamEvent.type === 'stream.event') {
      switch (streamEvent.event.type) {
        case 'quote.updated':
        case 'trade.printed':
        case 'bar.closed':
          assert.equal(streamEvent.event.payload.symbol.ticker, 'AAPL');
          break;
        default:
          throw new Error('Unexpected symbol-bearing event type.');
      }
    }

    let sawMsft = false;
    const monitor = (event: MessageEvent<string>) => {
      const parsed = parseGatewayServerMessage(JSON.parse(event.data));
      if (
        parsed.type === 'stream.event' &&
        (parsed.event.type === 'quote.updated' ||
          parsed.event.type === 'trade.printed' ||
          parsed.event.type === 'bar.closed') &&
        parsed.event.payload.symbol.ticker === 'MSFT'
      ) {
        sawMsft = true;
      }
    };

    socket.addEventListener('message', monitor);
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    socket.removeEventListener('message', monitor);
    assert.equal(sawMsft, false);

    socket.close();
    console.log('Smoke test passed.');
  } finally {
    await app.close();
  }
};

void run();
