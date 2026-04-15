export type MarketSymbol = {
  provider: string;
  symbol: string;
};

export type Quote = {
  symbol: string;
  price: number;
  currency: 'USD';
  changePercent: number;
  asOf: string;
  source: string;
};

export type QuoteSnapshotResponse = {
  data: Quote[];
  generatedAt: string;
};

export type HealthResponse = {
  service: string;
  status: 'ok';
  timestamp: string;
};

export type StreamEvent =
  | {
      type: 'quote.tick';
      payload: Quote;
    }
  | {
      type: 'system.heartbeat';
      payload: {
        timestamp: string;
      };
    };

export const DEFAULT_WATCHLIST: readonly MarketSymbol[] = [
  { provider: 'demo', symbol: 'AAPL' },
  { provider: 'demo', symbol: 'MSFT' },
  { provider: 'demo', symbol: 'NVDA' }
];
