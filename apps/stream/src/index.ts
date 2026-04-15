import { startStreamGateway } from './gateway-app';

const app = await startStreamGateway();

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'shutting down stream gateway');
  await app.close();
  process.exit(0);
};

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});
