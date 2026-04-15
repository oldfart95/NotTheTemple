import {
  alertRuleSchema,
  barSchema,
  companyProfileSchema,
  exchangeSchema,
  marketStatusSchema,
  newsItemSchema,
  providerHealthSchema,
  providerMetadataSchema,
  quoteSchema,
  streamEventSchema,
  symbolSchema,
  tradeSchema,
  watchlistSchema,
  type AlertRule,
  type AssetType,
  type Bar,
  type CompanyProfile,
  type Exchange,
  type MarketStatus,
  type NewsItem,
  type ProviderHealth,
  type ProviderMetadata,
  type Quote,
  type StreamEvent,
  type Symbol,
  type Trade,
  type Watchlist
} from './domain';

const now = '2026-04-14T14:30:00.000Z';

export const sampleExchange: Exchange = exchangeSchema.parse({
  id: 'xnys',
  mic: 'XNYS',
  name: 'New York Stock Exchange',
  countryCode: 'US',
  timezone: 'America/New_York',
  assetTypes: ['stock', 'etf'] satisfies AssetType[]
});

export const sampleProviderMetadata: ProviderMetadata = providerMetadataSchema.parse({
  providerId: 'demo',
  providerName: 'Demo Provider',
  dataset: 'iex-like-delayed',
  realtime: false,
  delayedBySeconds: 900
});

export const sampleSymbol: Symbol = symbolSchema.parse({
  id: 'us_xnys_aapl',
  ticker: 'AAPL',
  displayName: 'Apple Inc.',
  assetType: 'stock',
  exchange: sampleExchange,
  baseCurrency: 'USD',
  quoteCurrency: 'USD',
  isin: 'US0378331005',
  providerSymbol: 'AAPL',
  providerId: sampleProviderMetadata.providerId
});

export const sampleCryptoSymbol: Symbol = symbolSchema.parse({
  id: 'crypto_btcusd',
  ticker: 'BTC/USD',
  displayName: 'Bitcoin / US Dollar',
  assetType: 'crypto',
  exchange: {
    id: 'coinbase',
    mic: 'XCRY',
    name: 'Coinbase',
    countryCode: 'US',
    timezone: 'UTC',
    assetTypes: ['crypto']
  },
  baseCurrency: 'BTC',
  quoteCurrency: 'USD',
  providerSymbol: 'BTC-USD',
  providerId: sampleProviderMetadata.providerId
});

export const sampleForexSymbol: Symbol = symbolSchema.parse({
  id: 'fx_eurusd',
  ticker: 'EUR/USD',
  displayName: 'Euro / US Dollar',
  assetType: 'forex',
  exchange: {
    id: 'otc-fx',
    mic: 'FXOTC',
    name: 'Global FX OTC',
    countryCode: 'US',
    timezone: 'UTC',
    assetTypes: ['forex']
  },
  baseCurrency: 'EUR',
  quoteCurrency: 'USD',
  providerSymbol: 'EURUSD',
  providerId: sampleProviderMetadata.providerId
});

export const sampleMarketStatus: MarketStatus = marketStatusSchema.parse({
  exchange: sampleExchange,
  phase: 'open',
  isOpen: true,
  asOf: now,
  nextCloseTime: '2026-04-14T20:00:00.000Z'
});

export const sampleQuote: Quote = quoteSchema.parse({
  symbol: sampleSymbol,
  marketStatus: sampleMarketStatus,
  price: 189.42,
  currency: 'USD',
  change: 1.84,
  changePercent: 0.98,
  previousClose: 187.58,
  open: 188.1,
  high: 190.02,
  low: 187.91,
  dayVolume: 48233110,
  bid: 189.41,
  ask: 189.43,
  bidSize: 200,
  askSize: 250,
  sourceTime: now,
  ingestTime: '2026-04-14T14:30:01.250Z',
  provider: sampleProviderMetadata
});

export const sampleTrade: Trade = tradeSchema.parse({
  symbol: sampleSymbol,
  tradeId: 'trade-001',
  price: 189.4,
  size: 100,
  currency: 'USD',
  venue: 'XNYS',
  conditions: ['regular'],
  sourceTime: now,
  ingestTime: '2026-04-14T14:30:01.500Z',
  provider: sampleProviderMetadata
});

export const sampleBar: Bar = barSchema.parse({
  symbol: sampleSymbol,
  interval: '1m',
  open: 188.9,
  high: 189.8,
  low: 188.7,
  close: 189.42,
  volume: 125000,
  vwap: 189.1,
  startTime: '2026-04-14T14:29:00.000Z',
  endTime: now,
  sourceTime: now,
  ingestTime: '2026-04-14T14:30:02.000Z',
  provider: sampleProviderMetadata
});

export const sampleNewsItem: NewsItem = newsItemSchema.parse({
  id: 'news-001',
  headline: 'Apple announces new enterprise tooling',
  summary: 'The company introduced updates relevant to business customers and developers.',
  url: 'https://example.com/news/apple-enterprise-tooling',
  source: 'Example Markets',
  authors: ['Alex Reporter'],
  symbols: [sampleSymbol],
  sentiment: 'positive',
  sourceTime: '2026-04-14T13:45:00.000Z',
  ingestTime: '2026-04-14T13:45:03.000Z',
  provider: sampleProviderMetadata
});

export const sampleCompanyProfile: CompanyProfile = companyProfileSchema.parse({
  symbol: sampleSymbol,
  name: 'Apple Inc.',
  description: 'Designs consumer electronics, software, and services.',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  websiteUrl: 'https://www.apple.com',
  headquarters: 'Cupertino, California, United States',
  employeeCount: 161000,
  marketCap: 2900000000000,
  updatedAt: now,
  provider: sampleProviderMetadata
});

export const sampleWatchlist: Watchlist = watchlistSchema.parse({
  id: 'watchlist-tech-core',
  name: 'Tech Core',
  symbols: [
    sampleSymbol,
    {
      ...sampleSymbol,
      id: 'us_nasdaq_msft',
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
    }
  ],
  createdAt: '2026-04-14T10:00:00.000Z',
  updatedAt: now,
  isDefault: true
});

export const sampleAlertRule: AlertRule = alertRuleSchema.parse({
  id: 'alert-aapl-breakout',
  watchlistId: sampleWatchlist.id,
  symbol: sampleSymbol,
  field: 'price',
  operator: 'crossesAbove',
  threshold: 190,
  enabled: true,
  createdAt: '2026-04-14T10:05:00.000Z',
  updatedAt: now
});

export const sampleProviderHealth: ProviderHealth = providerHealthSchema.parse({
  providerId: sampleProviderMetadata.providerId,
  providerName: sampleProviderMetadata.providerName,
  status: 'healthy',
  realtimeAvailable: false,
  snapshotAvailable: true,
  lastCheckedAt: now,
  lastSuccessAt: now,
  latencyMs: 182,
  message: 'Delayed equities feed is responding normally.'
});

export const sampleStreamEvents: StreamEvent[] = [
  streamEventSchema.parse({
    type: 'quote.updated',
    eventId: 'evt-quote-001',
    emittedAt: '2026-04-14T14:30:02.100Z',
    payload: sampleQuote
  }),
  streamEventSchema.parse({
    type: 'trade.printed',
    eventId: 'evt-trade-001',
    emittedAt: '2026-04-14T14:30:02.200Z',
    payload: sampleTrade
  }),
  streamEventSchema.parse({
    type: 'bar.closed',
    eventId: 'evt-bar-001',
    emittedAt: '2026-04-14T14:30:02.300Z',
    payload: sampleBar
  }),
  streamEventSchema.parse({
    type: 'news.published',
    eventId: 'evt-news-001',
    emittedAt: '2026-04-14T14:30:02.400Z',
    payload: sampleNewsItem
  }),
  streamEventSchema.parse({
    type: 'provider.health',
    eventId: 'evt-health-001',
    emittedAt: '2026-04-14T14:30:02.500Z',
    payload: sampleProviderHealth
  }),
  streamEventSchema.parse({
    type: 'system.heartbeat',
    eventId: 'evt-heartbeat-001',
    emittedAt: '2026-04-14T14:30:02.600Z',
    payload: {
      service: '@market-tracker/stream',
      timestamp: '2026-04-14T14:30:02.600Z'
    }
  })
];

export const DEFAULT_WATCHLIST: readonly Symbol[] = sampleWatchlist.symbols;
