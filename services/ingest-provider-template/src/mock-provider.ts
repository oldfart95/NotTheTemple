import {
  parseBar,
  parseCompanyProfile,
  parseMarketStatus,
  parseQuote,
  parseSymbol,
  parseTrade,
  sampleCompanyProfile,
  sampleMarketStatus,
  sampleProviderHealth,
  sampleProviderMetadata,
  sampleSymbol,
  type Bar,
  type CompanyProfile,
  type MarketStatus,
  type ProviderHealth,
  type Symbol
} from '@market-tracker/contracts';

import { AbstractMarketDataProvider } from './abstract-provider';
import type {
  MarketDataProviderOptions,
  ProviderCapabilities,
  ProviderRateLimitMetadata,
  ProviderTimeframe
} from './provider';

const MOCK_SYMBOLS: Symbol[] = [
  sampleSymbol,
  {
    ...sampleSymbol,
    id: 'us_xnas_msft',
    ticker: 'MSFT',
    displayName: 'Microsoft Corporation',
    exchange: {
      id: 'xnas',
      mic: 'XNAS',
      name: 'NASDAQ',
      countryCode: 'US',
      timezone: 'America/New_York',
      assetTypes: ['stock', 'etf']
    },
    isin: 'US5949181045',
    providerSymbol: 'MSFT'
  },
  {
    ...sampleSymbol,
    id: 'us_xnas_nvda',
    ticker: 'NVDA',
    displayName: 'NVIDIA Corporation',
    exchange: {
      id: 'xnas',
      mic: 'XNAS',
      name: 'NASDAQ',
      countryCode: 'US',
      timezone: 'America/New_York',
      assetTypes: ['stock', 'etf']
    },
    isin: 'US67066G1040',
    providerSymbol: 'NVDA'
  }
];

const MOCK_CAPABILITIES: ProviderCapabilities = {
  supportsRealtimeQuotes: true,
  supportsTrades: true,
  supportsHistoricalBars: true,
  supportsNews: false,
  supportsCompanyProfiles: true,
  supportsPremarket: true,
  supportsAfterHours: true
};

type MockProviderOptions = MarketDataProviderOptions & {
  eventIntervalMs?: number;
};

export class MockMarketDataProvider extends AbstractMarketDataProvider {
  private readonly eventIntervalMs: number;
  private readonly symbolCatalog = new Map(MOCK_SYMBOLS.map((symbol) => [symbol.ticker, symbol]));
  private readonly subscriptions = new Map<string, Symbol>();
  private readonly symbolState = new Map<string, { lastPrice: number; tick: number }>();
  private readonly intervalHandles = new Set<NodeJS.Timeout>();

  constructor(options: MockProviderOptions = {}) {
    super(
      {
        id: 'mock-provider',
        displayName: 'Mock Market Data Provider',
        capabilities: MOCK_CAPABILITIES
      },
      options
    );

    this.eventIntervalMs = options.eventIntervalMs ?? 1_000;

    for (const [index, symbol] of MOCK_SYMBOLS.entries()) {
      this.symbolState.set(symbol.ticker, {
        lastPrice: 100 + index * 75,
        tick: 0
      });
    }

    this.setRateLimitMetadata(this.createRateLimitMetadata());
  }

  async subscribeSymbols(symbols: Symbol[]): Promise<void> {
    for (const symbol of symbols) {
      const normalized = this.resolveSymbol(symbol);
      this.subscriptions.set(normalized.ticker, normalized);
    }
  }

  async unsubscribeSymbols(symbols: Symbol[]): Promise<void> {
    for (const symbol of symbols) {
      this.subscriptions.delete(symbol.ticker);
    }
  }

  async fetchHistoricalBars(symbol: Symbol, timeframe: ProviderTimeframe, from: string, to: string): Promise<Bar[]> {
    const normalized = this.resolveSymbol(symbol);
    const start = new Date(from);
    const end = new Date(to);
    const intervalMs = this.intervalToMs(timeframe);
    const bars: Bar[] = [];

    let cursor = start.getTime();
    let seed = this.symbolState.get(normalized.ticker)?.lastPrice ?? 100;

    while (cursor < end.getTime()) {
      const next = Math.min(cursor + intervalMs, end.getTime());
      const drift = this.computeDrift(normalized.ticker, cursor);
      const open = seed;
      const close = open + drift;
      const high = Math.max(open, close) + 0.35;
      const low = Math.min(open, close) - 0.27;
      const volume = 5_000 + Math.round(Math.abs(drift) * 10_000);

      bars.push(
        parseBar({
          symbol: normalized,
          interval: timeframe,
          open: this.round(open),
          high: this.round(high),
          low: this.round(low),
          close: this.round(close),
          volume,
          vwap: this.round((open + close + high + low) / 4),
          startTime: new Date(cursor).toISOString(),
          endTime: new Date(next).toISOString(),
          sourceTime: new Date(next).toISOString(),
          ingestTime: new Date().toISOString(),
          provider: {
            ...sampleProviderMetadata,
            providerId: this.descriptor.id,
            providerName: this.descriptor.displayName,
            dataset: 'mock-equities-realtime',
            realtime: true,
            delayedBySeconds: 0
          }
        })
      );

      seed = close;
      cursor = next;
    }

    return bars;
  }

  async fetchCompanyProfile(symbol: Symbol): Promise<CompanyProfile> {
    const normalized = this.resolveSymbol(symbol);

    return parseCompanyProfile({
      ...sampleCompanyProfile,
      symbol: normalized,
      name: normalized.displayName,
      description: `${normalized.displayName} mock issuer profile from the provider template.`,
      updatedAt: new Date().toISOString(),
      provider: {
        ...sampleCompanyProfile.provider,
        providerId: this.descriptor.id,
        providerName: this.descriptor.displayName,
        dataset: 'mock-company-profiles',
        realtime: false,
        delayedBySeconds: 0
      }
    });
  }

  async fetchMarketStatus(): Promise<MarketStatus> {
    return parseMarketStatus({
      ...sampleMarketStatus,
      asOf: new Date().toISOString(),
      nextCloseTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      reason: 'Mock session is active.'
    });
  }

  protected async onConnect(): Promise<void> {
    await this.onDisconnect();

    const quoteTimer = setInterval(() => {
      this.safeEmitCycle('quote');
    }, this.eventIntervalMs);

    const tradeTimer = setInterval(() => {
      this.safeEmitCycle('trade');
    }, this.eventIntervalMs + 350);

    const barTimer = setInterval(() => {
      this.safeEmitCycle('bar');
    }, this.eventIntervalMs * 3);

    this.intervalHandles.add(quoteTimer);
    this.intervalHandles.add(tradeTimer);
    this.intervalHandles.add(barTimer);

    await this.emitProviderHealth();
  }

  protected async onDisconnect(): Promise<void> {
    for (const handle of this.intervalHandles) {
      clearInterval(handle);
    }
    this.intervalHandles.clear();
  }

  protected async buildHealth(): Promise<ProviderHealth> {
    return {
      ...sampleProviderHealth,
      providerId: this.descriptor.id,
      providerName: this.descriptor.displayName,
      status: 'healthy',
      realtimeAvailable: true,
      snapshotAvailable: true,
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      latencyMs: 25,
      message: `${this.subscriptions.size} symbol(s) subscribed in mock stream.`
    };
  }

  private safeEmitCycle(kind: 'quote' | 'trade' | 'bar'): void {
    try {
      if (this.subscriptions.size === 0) {
        return;
      }

      for (const symbol of this.subscriptions.values()) {
        if (kind === 'quote') {
          this.emitQuote(symbol);
        } else if (kind === 'trade') {
          this.emitTrade(symbol);
        } else {
          this.emitBar(symbol);
        }
      }

      this.setRateLimitMetadata(this.createRateLimitMetadata());
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      void this.handleConnectionError(normalizedError);
    }
  }

  private emitQuote(symbol: Symbol): void {
    const state = this.advanceState(symbol);
    const now = new Date().toISOString();

    this.emit({
      type: 'quote.updated',
      eventId: `${symbol.ticker}-quote-${state.tick}`,
      emittedAt: now,
      payload: parseQuote({
        symbol,
        marketStatus: {
          ...sampleMarketStatus,
          asOf: now
        },
        price: state.lastPrice,
        currency: symbol.quoteCurrency ?? symbol.baseCurrency,
        change: this.round(state.lastPrice - 100),
        changePercent: this.round(((state.lastPrice - 100) / 100) * 100),
        previousClose: this.round(state.lastPrice - 0.65),
        open: this.round(state.lastPrice - 0.2),
        high: this.round(state.lastPrice + 0.55),
        low: this.round(state.lastPrice - 0.85),
        dayVolume: 100_000 + state.tick * 1_500,
        bid: this.round(state.lastPrice - 0.01),
        ask: this.round(state.lastPrice + 0.01),
        bidSize: 100 + state.tick,
        askSize: 110 + state.tick,
        sourceTime: now,
        ingestTime: now,
        provider: {
          ...sampleProviderMetadata,
          providerId: this.descriptor.id,
          providerName: this.descriptor.displayName,
          dataset: 'mock-equities-realtime',
          realtime: true,
          delayedBySeconds: 0
        }
      })
    });
  }

  private emitTrade(symbol: Symbol): void {
    const state = this.advanceState(symbol);
    const now = new Date().toISOString();

    this.emit({
      type: 'trade.printed',
      eventId: `${symbol.ticker}-trade-${state.tick}`,
      emittedAt: now,
      payload: parseTrade({
        symbol,
        tradeId: `${symbol.ticker}-trade-${state.tick}`,
        price: state.lastPrice,
        size: 25 + (state.tick % 10) * 5,
        currency: symbol.quoteCurrency ?? symbol.baseCurrency,
        venue: symbol.exchange.mic,
        conditions: ['mock', 'regular'],
        sourceTime: now,
        ingestTime: now,
        provider: {
          ...sampleProviderMetadata,
          providerId: this.descriptor.id,
          providerName: this.descriptor.displayName,
          dataset: 'mock-equities-realtime',
          realtime: true,
          delayedBySeconds: 0
        }
      })
    });
  }

  private emitBar(symbol: Symbol): void {
    const state = this.advanceState(symbol);
    const end = Date.now();
    const start = end - 60_000;

    this.emit({
      type: 'bar.closed',
      eventId: `${symbol.ticker}-bar-${state.tick}`,
      emittedAt: new Date(end).toISOString(),
      payload: parseBar({
        symbol,
        interval: '1m',
        open: this.round(state.lastPrice - 0.4),
        high: this.round(state.lastPrice + 0.5),
        low: this.round(state.lastPrice - 0.6),
        close: state.lastPrice,
        volume: 2_000 + state.tick * 50,
        vwap: this.round(state.lastPrice - 0.08),
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        sourceTime: new Date(end).toISOString(),
        ingestTime: new Date().toISOString(),
        provider: {
          ...sampleProviderMetadata,
          providerId: this.descriptor.id,
          providerName: this.descriptor.displayName,
          dataset: 'mock-equities-realtime',
          realtime: true,
          delayedBySeconds: 0
        }
      })
    });
  }

  private advanceState(symbol: Symbol): { lastPrice: number; tick: number } {
    const current = this.symbolState.get(symbol.ticker);
    if (!current) {
      throw new Error(`No mock state configured for symbol ${symbol.ticker}`);
    }

    const nextTick = current.tick + 1;
    const drift = this.computeDrift(symbol.ticker, nextTick);
    const nextState = {
      tick: nextTick,
      lastPrice: this.round(current.lastPrice + drift)
    };

    this.symbolState.set(symbol.ticker, nextState);
    return nextState;
  }

  private computeDrift(ticker: string, seed: number): number {
    const bias = ticker.charCodeAt(0) % 7;
    return Math.sin(seed / 3 + bias) * 0.8;
  }

  private intervalToMs(timeframe: ProviderTimeframe): number {
    switch (timeframe) {
      case '1m':
        return 60_000;
      case '5m':
        return 5 * 60_000;
      case '15m':
        return 15 * 60_000;
      case '1h':
        return 60 * 60_000;
      case '1d':
        return 24 * 60 * 60_000;
    }
  }

  private createRateLimitMetadata(): ProviderRateLimitMetadata {
    const resetAt = new Date(Date.now() + 60_000).toISOString();
    return {
      updatedAt: new Date().toISOString(),
      windows: [
        {
          name: 'rest',
          limit: 120,
          remaining: Math.max(0, 120 - this.subscriptions.size * 3),
          windowSeconds: 60,
          resetAt
        },
        {
          name: 'stream',
          limit: 1_000,
          remaining: Math.max(0, 1_000 - this.subscriptions.size * 25),
          windowSeconds: 60,
          resetAt
        }
      ]
    };
  }

  private resolveSymbol(symbol: Symbol): Symbol {
    const existing = this.symbolCatalog.get(symbol.ticker);
    if (existing) {
      return existing;
    }

    return parseSymbol({
      ...symbol,
      providerId: this.descriptor.id
    });
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}

export const MOCK_PROVIDER_SYMBOLS = MOCK_SYMBOLS;
