import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import { ports, serviceNames } from '@market-tracker/config';
import type { HealthResponse, Quote, StreamEvent } from '@market-tracker/contracts';
import { DEFAULT_WATCHLIST } from '@market-tracker/contracts';

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

await app.register(websocket);

const createMockQuote = (symbol: string, index: number): Quote => ({
  symbol,
  price: 100 + index * 10 + Math.random(),
  currency: 'USD',
  changePercent: Number((Math.random() * 2 - 1).toFixed(2)),
  asOf: new Date().toISOString(),
  source: 'demo-stream'
});

app.get('/health', async (): Promise<HealthResponse> => {
  return {
    service: serviceNames.stream,
    status: 'ok',
    timestamp: new Date().toISOString()
  };
});

app.get('/ws', { websocket: true }, (socket) => {
  const heartbeat = setInterval(() => {
    const symbolIndex = Math.floor(Math.random() * DEFAULT_WATCHLIST.length);
    const { symbol } = DEFAULT_WATCHLIST[symbolIndex];
    const payload: StreamEvent = {
      type: 'quote.tick',
      payload: createMockQuote(symbol, symbolIndex)
    };

    socket.send(JSON.stringify(payload));
  }, 3000);

  socket.on('close', () => {
    clearInterval(heartbeat);
  });
});

const host = process.env.STREAM_HOST ?? '0.0.0.0';
const port = Number(process.env.STREAM_PORT ?? ports.stream);

await app.listen({ host, port });
