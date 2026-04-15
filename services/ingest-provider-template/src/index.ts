import { DEFAULT_WATCHLIST, type MarketSymbol, type Quote } from '@market-tracker/contracts';

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
  fetchSnapshot(symbols: MarketSymbol[]): Promise<Quote[]>;
  subscribe?(symbols: MarketSymbol[], onQuote: (quote: Quote) => void): Promise<void>;
}

export class MockProviderAdapter implements MarketDataProvider {
  readonly id = 'demo';
  readonly displayName = 'Demo Provider';
  readonly capabilities: ProviderCapabilities = {
    supportsStreaming: false,
    supportsSnapshots: true
  };

  async fetchSnapshot(symbols: MarketSymbol[] = [...DEFAULT_WATCHLIST]): Promise<Quote[]> {
    return symbols.map(({ symbol }, index) => ({
      symbol,
      price: 100 + index * 25 + 0.42,
      currency: 'USD',
      changePercent: 0.15 * (index + 1),
      asOf: new Date().toISOString(),
      source: this.id
    }));
  }
}

// TODO: Replace this mock with a real provider module and normalize vendor payloads here.
