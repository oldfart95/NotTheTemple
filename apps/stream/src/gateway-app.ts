import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { ports, serviceNames } from '@market-tracker/config';
import {
  healthResponseSchema,
  parseGatewayClientMessage,
  parseGatewayServerMessage,
  type GatewayClientMessage
} from '@market-tracker/contracts';

import { ClientRegistry } from './client-registry';
import type { StreamEventSource } from './event-source';
import { MockProviderEventSource } from './mock-event-source';

const parseSocketPayload = (raw: Buffer | ArrayBuffer | Buffer[]): string => {
  if (Array.isArray(raw)) {
    return Buffer.concat(raw).toString('utf8');
  }

  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw).toString('utf8');
  }

  return raw.toString('utf8');
};

export type StreamGatewayOptions = {
  eventSource?: StreamEventSource;
  heartbeatIntervalMs?: number;
  clientTimeoutMs?: number;
};

export const buildStreamGatewayApp = async (
  options: StreamGatewayOptions = {}
): Promise<FastifyInstance> => {
  const eventSource = options.eventSource ?? new MockProviderEventSource();
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10_000;
  const clientTimeoutMs = options.clientTimeoutMs ?? heartbeatIntervalMs * 2;
  const registry = new ClientRegistry();

  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  await app.register(websocket);

  const unbindSource = eventSource.onEvent((event) => {
    const delivered = registry.broadcast(event);
    app.log.debug(
      {
        eventType: event.type,
        delivered
      },
      'broadcasted normalized event'
    );
  });

  app.get('/health', async () => {
    return healthResponseSchema.parse({
      service: serviceNames.stream,
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health/details', async () => {
    return {
      ...healthResponseSchema.parse({
        service: serviceNames.stream,
        status: 'ok',
        timestamp: new Date().toISOString()
      }),
      clients: registry.getConnectionCount(),
      providerHealth: await eventSource.healthCheck()
    };
  });

  app.get('/ws', { websocket: true }, (socket) => {
    const clientId = crypto.randomUUID();

    registry.register({
      id: clientId,
      send(message) {
        socket.send(JSON.stringify(message));
      },
      ping() {
        socket.ping();
      },
      close(code, reason) {
        socket.close(code, reason);
      }
    });

    app.log.info({ clientId }, 'client connected');

    socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const message = parseGatewayClientMessage(JSON.parse(parseSocketPayload(raw))) satisfies GatewayClientMessage;

        if (message.type === 'ping') {
          registry.touchPong(clientId);
          socket.send(
            JSON.stringify(
              parseGatewayServerMessage({
                type: 'pong',
                timestamp: message.timestamp ?? new Date().toISOString()
              })
            )
          );
          return;
        }

        const updated = registry.updateSubscriptions(clientId, message.type, message.symbols);
        app.log.info(
          {
            clientId,
            operation: message.type,
            symbols: updated
          },
          'client subscriptions updated'
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid client message.';
        socket.send(
          JSON.stringify(
            parseGatewayServerMessage({
              type: 'error',
              message
            })
          )
        );
      }
    });

    socket.on('pong', () => {
      registry.touchPong(clientId);
    });

    socket.on('close', (code: number, reasonBuffer: Buffer) => {
      const reason = reasonBuffer.toString();
      registry.unregister(clientId);
      app.log.info({ clientId, code, reason }, 'client disconnected');
    });

    socket.on('error', (error: Error) => {
      registry.unregister(clientId);
      app.log.warn({ clientId, error }, 'dropping errored client');
    });
  });

  const heartbeatTimer = setInterval(() => {
    for (const clientId of registry.getClientIds()) {
      registry.sendHeartbeat(clientId);
    }

    for (const clientId of registry.getStaleClientIds(clientTimeoutMs)) {
      app.log.warn({ clientId }, 'dropping stale client');
      registry.dropClient(clientId, 4000, 'Heartbeat timeout');
      app.log.warn({ clientId }, 'client dropped after missed heartbeats');
    }
  }, heartbeatIntervalMs);

  app.addHook('onReady', async () => {
    await eventSource.start();
    app.log.info('stream event source started');
  });

  app.addHook('onClose', async () => {
    clearInterval(heartbeatTimer);
    unbindSource();
    await eventSource.stop();
  });

  return app;
};

export const startStreamGateway = async (options: StreamGatewayOptions = {}): Promise<FastifyInstance> => {
  const app = await buildStreamGatewayApp(options);
  const host = process.env.STREAM_HOST ?? '0.0.0.0';
  const port = Number(process.env.STREAM_PORT ?? ports.stream);
  await app.listen({ host, port });
  return app;
};
