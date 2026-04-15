import {
  DEFAULT_WATCHLIST,
  parseQuote,
  sampleMarketStatus,
  sampleProviderHealth,
  type ProviderHealth,
  type Quote,
  type Symbol
} from '@market-tracker/contracts';

export type ProviderCapabilities = {
  supportsStreaming: boolean;
  supportsSnapshots: boolean;
};

export interface MarketDataProvider {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  fetchSnapshot(symbols: Symbol[]): Promise<Quote[]>;
  getHealth?(): Promise<ProviderHealth>;
  subscribe?(symbols: Symbol[], onQuote: (quote: Quote) => void): Promise<void>;
}

export class MockProviderAdapter implements MarketDataProvider {
  readonly id = 'demo';
  readonly displayName = 'Demo Provider';
  readonly capabilities: ProviderCapabilities = {
    supportsStreaming: false,
    supportsSnapshots: true
  };

  async fetchSnapshot(symbols: Symbol[] = [...DEFAULT_WATCHLIST]): Promise<Quote[]> {
    return symbols.map((symbol, index) =>
      parseQuote({
        symbol,
        marketStatus: sampleMarketStatus,
        price: 100 + index * 25 + 0.42,
        currency: symbol.quoteCurrency ?? symbol.baseCurrency,
        change: Number((0.35 * (index + 1)).toFixed(2)),
        changePercent: 0.15 * (index + 1),
        previousClose: 100 + index * 25.07,
        open: 100 + index * 25.12,
        high: 100 + index * 25.95,
        low: 100 + index * 24.91,
        dayVolume: 250000 * (index + 1),
        bid: 100 + index * 25 + 0.4,
        ask: 100 + index * 25 + 0.44,
        bidSize: 100,
        askSize: 120,
        sourceTime: new Date().toISOString(),
        ingestTime: new Date().toISOString(),
        provider: {
          providerId: this.id,
          providerName: this.displayName,
          dataset: 'demo-delayed-equities',
          realtime: false,
          delayedBySeconds: 900
        }
      })
    );
  }

  async getHealth(): Promise<ProviderHealth> {
    return {
      ...sampleProviderHealth,
      providerId: this.id,
      providerName: this.displayName
    };
  }
}

// TODO: Replace this mock with a real provider module and normalize vendor payloads here.
