import {
  parseStreamEvent,
  type ProviderHealth,
  type StreamEvent
} from '@market-tracker/contracts';
import {
  MOCK_PROVIDER_SYMBOLS,
  MockMarketDataProvider
} from '../../../services/ingest-provider-template/src/index';

import type { StreamEventListener, StreamEventSource } from './event-source';

export class MockProviderEventSource implements StreamEventSource {
  private readonly provider: MockMarketDataProvider;
  private readonly listeners = new Set<StreamEventListener>();
  private unsubscribeProviderEvents?: () => void;
  private marketStatusTimer?: NodeJS.Timeout;

  constructor() {
    this.provider = new MockMarketDataProvider({
      eventIntervalMs: 750,
      reconnectStrategy: {
        maxAttempts: 3
      }
    });
  }

  async start(): Promise<void> {
    this.unsubscribeProviderEvents = this.provider.onEvent((event: StreamEvent) => {
      this.emit(event);
    });

    await this.provider.connect();
    await this.provider.subscribeSymbols(MOCK_PROVIDER_SYMBOLS);

    this.marketStatusTimer = setInterval(() => {
      void this.emitMarketStatus();
    }, 15_000);

    await this.emitMarketStatus();
  }

  async stop(): Promise<void> {
    if (this.marketStatusTimer) {
      clearInterval(this.marketStatusTimer);
      this.marketStatusTimer = undefined;
    }

    this.unsubscribeProviderEvents?.();
    this.unsubscribeProviderEvents = undefined;
    await this.provider.disconnect();
  }

  onEvent(listener: StreamEventListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async healthCheck(): Promise<ProviderHealth | undefined> {
    return (await this.provider.healthCheck()).health;
  }

  private emit(event: StreamEvent): void {
    const parsed = parseStreamEvent(event);
    for (const listener of this.listeners) {
      listener(parsed);
    }
  }

  private async emitMarketStatus(): Promise<void> {
    const status = await this.provider.fetchMarketStatus();
    this.emit(
      parseStreamEvent({
        type: 'market.status',
        eventId: `market-status-${Date.now()}`,
        emittedAt: new Date().toISOString(),
        payload: status
      })
    );
  }
}
