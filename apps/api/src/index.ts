import cors from '@fastify/cors';
import Fastify from 'fastify';
import { ports, serviceNames } from '@market-tracker/config';
import type { HealthResponse, QuoteSnapshotResponse } from '@market-tracker/contracts';
import { DEFAULT_WATCHLIST } from '@market-tracker/contracts';
import { MockProviderAdapter } from '@market-tracker/ingest-provider-template';

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

const provider = new MockProviderAdapter();

app.get('/health', async (): Promise<HealthResponse> => {
  return {
    service: serviceNames.api,
    status: 'ok',
    timestamp: new Date().toISOString()
  };
});

app.get('/quotes/snapshot', async (): Promise<QuoteSnapshotResponse> => {
  const data = await provider.fetchSnapshot([...DEFAULT_WATCHLIST]);

  return {
    data,
    generatedAt: new Date().toISOString()
  };
});

const host = process.env.API_HOST ?? '0.0.0.0';
const port = Number(process.env.API_PORT ?? ports.api);

await app.listen({ host, port });
