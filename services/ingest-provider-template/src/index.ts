export * from './provider';
export * from './abstract-provider';
export * from './mock-provider';

import {
  parseQuote,
  sampleMarketStatus,
  sampleProviderHealth,
  type ProviderHealth,
  type Quote,
  type Symbol
} from '@market-tracker/contracts';

/**
 * Backward-compatible adapter kept temporarily so placeholder services that
 * still rely on snapshot-style APIs continue to build while the provider
 * abstraction is adopted elsewhere.
 */
export class MockProviderAdapter {
  readonly id = 'demo';
  readonly displayName = 'Demo Provider';
  readonly capabilities = {
    supportsStreaming: false,
    supportsSnapshots: true
  };

  async fetchSnapshot(symbols: Symbol[]): Promise<Quote[]> {
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
