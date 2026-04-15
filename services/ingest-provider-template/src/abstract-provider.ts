import {
  parseProviderHealth,
  parseStreamEvent,
  type CompanyProfile,
  type MarketStatus,
  type ProviderHealth,
  type StreamEvent,
  type Symbol
} from '@market-tracker/contracts';

import type {
  MarketDataProvider,
  MarketDataProviderOptions,
  ProviderDescriptor,
  ProviderEventListener,
  ProviderHealthReport,
  ProviderRateLimitMetadata,
  ProviderTimeframe,
  ReconnectAttemptContext
} from './provider';

const wait = (delayMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayMs));

export abstract class AbstractMarketDataProvider implements MarketDataProvider {
  readonly descriptor: ProviderDescriptor;

  private readonly reconnectStrategy;
  private readonly listeners = new Set<ProviderEventListener>();
  private rateLimitMetadata?: ProviderRateLimitMetadata;
  private connected = false;
  private disconnecting = false;
  private reconnecting = false;

  protected constructor(descriptor: ProviderDescriptor, options: MarketDataProviderOptions = {}) {
    this.descriptor = descriptor;
    this.reconnectStrategy = options.reconnectStrategy;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    this.disconnecting = false;
    await this.onConnect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected && !this.reconnecting) {
      return;
    }

    this.disconnecting = true;
    this.reconnecting = false;

    try {
      await this.onDisconnect();
    } finally {
      this.connected = false;
      this.disconnecting = false;
    }
  }

  abstract subscribeSymbols(symbols: Symbol[]): Promise<void>;

  abstract unsubscribeSymbols(symbols: Symbol[]): Promise<void>;

  abstract fetchHistoricalBars(
    symbol: Symbol,
    timeframe: ProviderTimeframe,
    from: string,
    to: string
  ): Promise<import('@market-tracker/contracts').Bar[]>;

  abstract fetchCompanyProfile(symbol: Symbol): Promise<CompanyProfile>;

  abstract fetchMarketStatus(): Promise<MarketStatus>;

  async healthCheck(): Promise<ProviderHealthReport> {
    const health = parseProviderHealth(await this.buildHealth());

    return {
      health,
      capabilities: this.descriptor.capabilities,
      rateLimits: this.rateLimitMetadata
    };
  }

  getRateLimitMetadata(): ProviderRateLimitMetadata | undefined {
    return this.rateLimitMetadata;
  }

  onEvent(listener: ProviderEventListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  protected abstract onConnect(): Promise<void>;

  protected abstract onDisconnect(): Promise<void>;

  protected abstract buildHealth(): Promise<ProviderHealth>;

  protected emit(event: StreamEvent): void {
    const parsed = parseStreamEvent(event);
    for (const listener of this.listeners) {
      listener(parsed);
    }
  }

  protected setRateLimitMetadata(metadata: ProviderRateLimitMetadata): void {
    this.rateLimitMetadata = metadata;
  }

  protected async emitProviderHealth(): Promise<void> {
    const health = await this.buildHealth();
    this.emit({
      type: 'provider.health',
      eventId: `${this.descriptor.id}-health-${Date.now()}`,
      emittedAt: new Date().toISOString(),
      payload: health
    });
  }

  protected async handleConnectionError(error: Error): Promise<void> {
    if (this.disconnecting || this.reconnecting) {
      return;
    }

    const strategy = this.reconnectStrategy;
    if (!strategy) {
      throw error;
    }

    this.connected = false;
    this.reconnecting = true;

    const maxAttempts = strategy.maxAttempts ?? 5;
    let attempt = 0;

    while (!this.disconnecting && attempt < maxAttempts) {
      attempt += 1;
      const context: ReconnectAttemptContext = {
        providerId: this.descriptor.id,
        attempt,
        error,
        startedAt: new Date().toISOString()
      };

      const shouldReconnect = strategy.shouldReconnect?.(context) ?? true;
      if (!shouldReconnect) {
        await strategy.onReconnectFailure?.({
          ...context,
          willRetry: false
        });
        this.reconnecting = false;
        throw error;
      }

      const delayMs = strategy.getDelayMs?.(context) ?? Math.min(1000 * 2 ** (attempt - 1), 30_000);
      await strategy.onReconnectScheduled?.({
        ...context,
        delayMs
      });
      await wait(delayMs);
      await strategy.onReconnectAttempt?.(context);

      try {
        await this.onDisconnect();
        await this.onConnect();
        this.connected = true;
        this.reconnecting = false;
        await strategy.onReconnectSuccess?.({
          providerId: this.descriptor.id,
          attempts: attempt,
          reconnectedAt: new Date().toISOString()
        });
        return;
      } catch (reconnectError) {
        const normalizedError = reconnectError instanceof Error ? reconnectError : new Error(String(reconnectError));
        await strategy.onReconnectFailure?.({
          providerId: this.descriptor.id,
          attempt,
          error: normalizedError,
          startedAt: context.startedAt,
          willRetry: attempt < maxAttempts
        });
      }
    }

    this.reconnecting = false;
    throw error;
  }
}
