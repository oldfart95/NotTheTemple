import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  POSTGRES_HOST: z.string().min(1).default('127.0.0.1'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().min(1).default('market_tracker'),
  POSTGRES_USER: z.string().min(1).default('market_tracker'),
  POSTGRES_PASSWORD: z.string().min(1).default('market_tracker'),
  POSTGRES_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DATABASE_URL: z.string().optional(),
  API_AUTO_SEED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true')
});

export type ApiEnv = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export const resolveDatabaseConnectionString = (): string => {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const password = encodeURIComponent(env.POSTGRES_PASSWORD);
  return `postgresql://${env.POSTGRES_USER}:${password}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;
};
