import {
  barSchema,
  companyProfileSchema,
  marketStatusSchema,
  providerHealthSchema,
  sampleCompanyProfile,
  sampleCryptoSymbol,
  sampleExchange,
  sampleForexSymbol,
  sampleMarketStatus,
  sampleProviderHealth,
  sampleProviderMetadata,
  sampleSymbol,
  symbolSchema,
  type Bar,
  type BarInterval,
  type CompanyProfile,
  type MarketStatus,
  type ProviderHealth,
  type Symbol
} from '@market-tracker/contracts';

const now = new Date('2026-04-14T14:30:00.000Z');

const msft = symbolSchema.parse({
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
});

const nvda = symbolSchema.parse({
  ...sampleSymbol,
  id: 'us_xnas_nvda',
  ticker: 'NVDA',
  displayName: 'NVIDIA Corporation',
  exchange: msft.exchange,
  isin: 'US67066G1040',
  providerSymbol: 'NVDA'
});

export const fixtureSymbols: Symbol[] = [sampleSymbol, msft, nvda, sampleCryptoSymbol, sampleForexSymbol];

export const fixtureProfiles: CompanyProfile[] = [
  sampleCompanyProfile,
  companyProfileSchema.parse({
    symbol: msft,
    name: 'Microsoft Corporation',
    description: 'Builds software, cloud platforms, productivity tools, and AI infrastructure.',
    sector: 'Technology',
    industry: 'Software Infrastructure',
    websiteUrl: 'https://www.microsoft.com',
    headquarters: 'Redmond, Washington, United States',
    employeeCount: 228000,
    marketCap: 3100000000000,
    updatedAt: now.toISOString(),
    provider: sampleProviderMetadata
  }),
  companyProfileSchema.parse({
    symbol: nvda,
    name: 'NVIDIA Corporation',
    description: 'Designs GPUs, accelerated computing systems, and AI platform software.',
    sector: 'Technology',
    industry: 'Semiconductors',
    websiteUrl: 'https://www.nvidia.com',
    headquarters: 'Santa Clara, California, United States',
    employeeCount: 29600,
    marketCap: 2600000000000,
    updatedAt: now.toISOString(),
    provider: sampleProviderMetadata
  }),
  companyProfileSchema.parse({
    symbol: sampleCryptoSymbol,
    name: 'Bitcoin',
    description: 'A decentralized digital asset used as a global cryptocurrency network.',
    sector: 'Digital Assets',
    industry: 'Cryptocurrency',
    websiteUrl: 'https://bitcoin.org',
    updatedAt: now.toISOString(),
    provider: sampleProviderMetadata
  }),
  companyProfileSchema.parse({
    symbol: sampleForexSymbol,
    name: 'Euro / US Dollar',
    description: 'The most heavily traded foreign exchange pair in the global FX market.',
    sector: 'Currencies',
    industry: 'Foreign Exchange',
    updatedAt: now.toISOString(),
    provider: sampleProviderMetadata
  })
];

export const fixtureMarketStatuses: MarketStatus[] = [
  sampleMarketStatus,
  marketStatusSchema.parse({
    exchange: msft.exchange,
    phase: 'open',
    isOpen: true,
    asOf: now.toISOString(),
    nextCloseTime: new Date('2026-04-14T20:00:00.000Z').toISOString()
  }),
  marketStatusSchema.parse({
    exchange: sampleCryptoSymbol.exchange,
    phase: 'open',
    isOpen: true,
    asOf: now.toISOString()
  }),
  marketStatusSchema.parse({
    exchange: sampleForexSymbol.exchange,
    phase: 'open',
    isOpen: true,
    asOf: now.toISOString()
  }),
  marketStatusSchema.parse({
    exchange: {
      ...sampleExchange,
      id: 'xnas',
      mic: 'XNAS',
      name: 'NASDAQ'
    },
    phase: 'open',
    isOpen: true,
    asOf: now.toISOString(),
    nextCloseTime: new Date('2026-04-14T20:00:00.000Z').toISOString()
  })
];

export const fixtureProviderHealth: ProviderHealth[] = [
  sampleProviderHealth,
  providerHealthSchema.parse({
    ...sampleProviderHealth,
    providerId: 'demo-cache',
    providerName: 'Metadata Cache',
    status: 'healthy',
    latencyMs: 12,
    message: 'Cached symbol metadata is available.'
  })
];

const intervalMs: Record<BarInterval, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '1d': 86_400_000
};

const basePrices: Record<string, number> = {
  AAPL: 189.42,
  MSFT: 425.17,
  NVDA: 908.55,
  'BTC/USD': 70425.3,
  'EUR/USD': 1.0834
};

export const generateFixtureBars = (symbol: Symbol, timeframe: BarInterval, from: Date, to: Date): Bar[] => {
  const stepMs = intervalMs[timeframe];
  const basePrice = basePrices[symbol.ticker] ?? 100;
  const bars: Bar[] = [];

  for (let cursor = from.getTime(), index = 0; cursor < to.getTime(); cursor += stepMs, index += 1) {
    const drift = index * 0.12;
    const noise = ((index % 5) - 2) * 0.08;
    const open = Number((basePrice + drift + noise).toFixed(4));
    const close = Number((open + 0.18).toFixed(4));
    const high = Number((close + 0.11).toFixed(4));
    const low = Number((open - 0.13).toFixed(4));
    const volume = timeframe === '1d' ? 4_000_000 + index * 25_000 : 50_000 + index * 1_250;

    bars.push(
      barSchema.parse({
        symbol,
        interval: timeframe,
        open,
        high,
        low,
        close,
        volume,
        vwap: Number(((open + close + high + low) / 4).toFixed(4)),
        startTime: new Date(cursor).toISOString(),
        endTime: new Date(cursor + stepMs).toISOString(),
        sourceTime: new Date(cursor + stepMs).toISOString(),
        ingestTime: new Date(cursor + stepMs + 500).toISOString(),
        provider: sampleProviderMetadata
      })
    );
  }

  return bars;
};
