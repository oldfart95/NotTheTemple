import { pool } from './db/client';
import { ApiRepository } from './db/repository';
import { seedDevelopmentData } from './db/seed';

const repository = new ApiRepository(pool);

await repository.ensureSchema();
await seedDevelopmentData(repository);

console.log('Seeded API development data.');
await pool.end();
