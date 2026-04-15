import { type StreamEvent } from '@market-tracker/contracts';

import { MockMarketDataProvider, MOCK_PROVIDER_SYMBOLS } from './mock-provider';

const run = async (): Promise<void> => {
  const runtimeMs = Number(process.env.MOCK_PROVIDER_RUNTIME_MS ?? 6_000);
  const provider = new MockMarketDataProvider({
    eventIntervalMs: 750,
    reconnectStrategy: {
      maxAttempts: 3,
      onReconnectScheduled(context) {
        console.log(`[reconnect] scheduled attempt ${context.attempt} in ${context.delayMs}ms`);
      },
      onReconnectAttempt(context) {
        console.log(`[reconnect] attempting reconnect ${context.attempt} for ${context.providerId}`);
      },
      onReconnectSuccess(context) {
        console.log(`[reconnect] ${context.providerId} recovered after ${context.attempts} attempt(s)`);
      },
      onReconnectFailure(context) {
        console.log(
          `[reconnect] attempt ${context.attempt} failed for ${context.providerId}; willRetry=${context.willRetry}`
        );
      }
    }
  });

  const unsubscribeEventStream = provider.onEvent((event) => {
    logEvent(event);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[shutdown] received ${signal}, closing provider...`);
    unsubscribeEventStream();
    await provider.disconnect();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  await provider.connect();
  await provider.subscribeSymbols(MOCK_PROVIDER_SYMBOLS.slice(0, 2));

  console.log(`[provider] ${provider.descriptor.displayName} connected`);
  console.log(`[provider] capabilities ${JSON.stringify(provider.descriptor.capabilities)}`);

  const status = await provider.fetchMarketStatus();
  console.log(`[status] ${status.exchange.mic} phase=${status.phase} open=${status.isOpen}`);

  const profile = await provider.fetchCompanyProfile(MOCK_PROVIDER_SYMBOLS[0]);
  console.log(`[profile] ${profile.symbol.ticker} -> ${profile.name}`);

  const bars = await provider.fetchHistoricalBars(
    MOCK_PROVIDER_SYMBOLS[0],
    '1m',
    new Date(Date.now() - 5 * 60_000).toISOString(),
    new Date().toISOString()
  );
  console.log(`[bars] fetched ${bars.length} historical bars`);

  const health = await provider.healthCheck();
  console.log(`[health] ${health.health.status} rateLimits=${JSON.stringify(health.rateLimits)}`);

  setTimeout(() => {
    void provider.unsubscribeSymbols([MOCK_PROVIDER_SYMBOLS[1]]).then(() => {
      console.log(`[subscription] unsubscribed ${MOCK_PROVIDER_SYMBOLS[1].ticker}`);
    });
  }, 4_000);

  setTimeout(() => {
    void shutdown('AUTO_SHUTDOWN');
  }, runtimeMs);
};

const logEvent = (event: StreamEvent): void => {
  switch (event.type) {
    case 'quote.updated':
      console.log(`[event] ${event.type} ${event.payload.symbol.ticker} ${event.payload.price}`);
      break;
    case 'trade.printed':
      console.log(`[event] ${event.type} ${event.payload.symbol.ticker} ${event.payload.size}@${event.payload.price}`);
      break;
    case 'bar.closed':
      console.log(`[event] ${event.type} ${event.payload.symbol.ticker} close=${event.payload.close}`);
      break;
    case 'provider.health':
      console.log(`[event] ${event.type} ${event.payload.status}`);
      break;
    default:
      console.log(`[event] ${event.type}`);
      break;
  }
};

void run();
