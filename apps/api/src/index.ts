import cors from '@fastify/cors';
import Fastify from 'fastify';
import { ports, serviceNames } from '@market-tracker/config';
import {
  DEFAULT_WATCHLIST,
  healthResponseSchema,
  quoteSnapshotResponseSchema,
  type HealthResponse,
  type QuoteSnapshotResponse
} from '@market-tracker/contracts';
import { MockProviderAdapter } from '@market-tracker/ingest-provider-template';

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

const provider = new MockProviderAdapter();

app.get('/health', async (): Promise<HealthResponse> => {
  return healthResponseSchema.parse({
    service: serviceNames.api,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/quotes/snapshot', async (): Promise<QuoteSnapshotResponse> => {
  const data = await provider.fetchSnapshot([...DEFAULT_WATCHLIST]);
  const providerHealth = await provider.getHealth?.();

  return quoteSnapshotResponseSchema.parse({
    data,
    generatedAt: new Date().toISOString(),
    providerHealth
  });
});

const host = process.env.API_HOST ?? '0.0.0.0';
const port = Number(process.env.API_PORT ?? ports.api);

await app.listen({ host, port });
