import pg from 'pg';
import { env, resolveDatabaseConnectionString } from '../env';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: resolveDatabaseConnectionString(),
  ssl: env.POSTGRES_SSL ? { rejectUnauthorized: false } : false
});
