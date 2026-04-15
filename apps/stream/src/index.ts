import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import { ports, serviceNames } from '@market-tracker/config';
import {
  DEFAULT_WATCHLIST,
  healthResponseSchema,
  parseQuote,
  sampleMarketStatus,
  streamEventSchema,
  type HealthResponse,
  type Quote,
  type StreamEvent
} from '@market-tracker/contracts';

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

await app.register(websocket);

const createMockQuote = (index: number): Quote => {
  const symbol = DEFAULT_WATCHLIST[index];

  return parseQuote({
    symbol,
    marketStatus: sampleMarketStatus,
    price: 100 + index * 10 + Math.random(),
    currency: symbol.quoteCurrency ?? symbol.baseCurrency,
    change: Number((Math.random() * 4 - 2).toFixed(2)),
    changePercent: Number((Math.random() * 2 - 1).toFixed(2)),
    previousClose: 100 + index * 10,
    sourceTime: new Date().toISOString(),
    ingestTime: new Date().toISOString(),
    provider: {
      providerId: 'demo-stream',
      providerName: 'Demo Stream',
      dataset: 'demo-delayed-equities',
      realtime: false,
      delayedBySeconds: 900
    }
  });
};

app.get('/health', async (): Promise<HealthResponse> => {
  return healthResponseSchema.parse({
    service: serviceNames.stream,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/ws', { websocket: true }, (socket) => {
  const heartbeat = setInterval(() => {
    const symbolIndex = Math.floor(Math.random() * DEFAULT_WATCHLIST.length);
    const payload: StreamEvent = streamEventSchema.parse({
      type: 'quote.updated',
      eventId: `evt-quote-${Date.now()}`,
      emittedAt: new Date().toISOString(),
      payload: createMockQuote(symbolIndex)
    });

    socket.send(JSON.stringify(payload));
  }, 3000);

  socket.on('close', () => {
    clearInterval(heartbeat);
  });
});

const host = process.env.STREAM_HOST ?? '0.0.0.0';
const port = Number(process.env.STREAM_PORT ?? ports.stream);

await app.listen({ host, port });
