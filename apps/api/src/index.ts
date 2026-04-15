import { ports, serviceNames } from '@market-tracker/config';
import { buildApp } from './app';
import { pool } from './db/client';
import { ApiRepository } from './db/repository';
import { seedDevelopmentData } from './db/seed';
import { env } from './env';

const repository = new ApiRepository(pool);
await repository.ensureSchema();

if (env.API_AUTO_SEED && env.NODE_ENV !== 'production') {
  await seedDevelopmentData(repository);
}

const app = buildApp(repository);

app.addHook('onClose', async () => {
  await pool.end();
});

await app.listen({ host: env.API_HOST, port: Number(process.env.API_PORT ?? ports.api) });
app.log.info(`${serviceNames.api} listening on ${env.API_HOST}:${env.API_PORT}`);
