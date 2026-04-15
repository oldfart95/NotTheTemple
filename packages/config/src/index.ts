export const ports = {
  web: Number(process.env.WEB_PORT ?? 3000),
  api: Number(process.env.API_PORT ?? 4000),
  stream: Number(process.env.STREAM_PORT ?? 4010)
};

export const serviceNames = {
  web: '@market-tracker/web',
  api: '@market-tracker/api',
  stream: '@market-tracker/stream'
} as const;

// TODO: Centralize env validation once multiple services read the same variables.
