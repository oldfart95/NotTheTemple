import { z } from 'zod';

const timestampSchema = z.string().datetime({ offset: true });
const urlSchema = z.string().url();

/**
 * Canonical classification used across providers so the rest of the platform
 * can reason about instruments without knowing vendor-specific labels.
 */
export const assetTypeSchema = z.enum(['stock', 'etf', 'index', 'crypto', 'forex', 'option', 'future']);
export type AssetType = z.infer<typeof assetTypeSchema>;

/**
 * Canonical exchange/venue metadata referenced by symbols and market status.
 */
export const exchangeSchema = z.object({
  id: z.string().min(1),
  mic: z.string().min(1).max(10),
  name: z.string().min(1),
  countryCode: z.string().length(2),
  timezone: z.string().min(1),
  assetTypes: z.array(assetTypeSchema).default([])
});
export type Exchange = z.infer<typeof exchangeSchema>;

/**
 * Provider-neutral instrument identity. This is the symbol model the rest of
 * the app should use after a provider payload has been normalized.
 */
export const symbolSchema = z.object({
  id: z.string().min(1),
  ticker: z.string().min(1),
  displayName: z.string().min(1),
  assetType: assetTypeSchema,
  exchange: exchangeSchema,
  baseCurrency: z.string().length(3),
  quoteCurrency: z.string().length(3).optional(),
  isin: z.string().optional(),
  providerSymbol: z.string().min(1),
  providerId: z.string().min(1)
});
export type Symbol = z.infer<typeof symbolSchema>;

/**
 * Shared provider metadata attached to normalized records so debugging and
 * provenance stay visible without leaking vendor-shaped payloads.
 */
export const providerMetadataSchema = z.object({
  providerId: z.string().min(1),
  providerName: z.string().min(1),
  dataset: z.string().min(1),
  realtime: z.boolean(),
  delayedBySeconds: z.number().int().nonnegative().default(0)
});
export type ProviderMetadata = z.infer<typeof providerMetadataSchema>;

/**
 * Common timing fields. `sourceTime` is when the provider says the event
 * happened; `ingestTime` is when our platform normalized it.
 */
export const timingSchema = z.object({
  sourceTime: timestampSchema,
  ingestTime: timestampSchema
});
export type Timing = z.infer<typeof timingSchema>;

/**
 * Current venue/session status used to annotate snapshots and stream context.
 */
export const marketStatusSchema = z.object({
  exchange: exchangeSchema,
  phase: z.enum(['pre', 'open', 'post', 'closed', 'halted']),
  isOpen: z.boolean(),
  asOf: timestampSchema,
  nextOpenTime: timestampSchema.optional(),
  nextCloseTime: timestampSchema.optional(),
  reason: z.string().optional()
});
export type MarketStatus = z.infer<typeof marketStatusSchema>;

/**
 * Latest top-of-book style quote snapshot for a symbol.
 */
export const quoteSchema = z
  .object({
    symbol: symbolSchema,
    marketStatus: marketStatusSchema.optional(),
    price: z.number(),
    currency: z.string().length(3),
    change: z.number(),
    changePercent: z.number(),
    previousClose: z.number().optional(),
    open: z.number().optional(),
    high: z.number().optional(),
    low: z.number().optional(),
    dayVolume: z.number().nonnegative().optional(),
    bid: z.number().optional(),
    ask: z.number().optional(),
    bidSize: z.number().nonnegative().optional(),
    askSize: z.number().nonnegative().optional(),
    provider: providerMetadataSchema
  })
  .merge(timingSchema);
export type Quote = z.infer<typeof quoteSchema>;

/**
 * Last-sale style trade record for stream processing and analytics.
 */
export const tradeSchema = z
  .object({
    symbol: symbolSchema,
    tradeId: z.string().min(1),
    price: z.number(),
    size: z.number().positive(),
    currency: z.string().length(3),
    venue: z.string().min(1).optional(),
    conditions: z.array(z.string()).default([]),
    provider: providerMetadataSchema
  })
  .merge(timingSchema);
export type Trade = z.infer<typeof tradeSchema>;

/**
 * Canonical OHLCV bar used for charts and aggregation regardless of provider.
 */
export const barSchema = z
  .object({
    symbol: symbolSchema,
    interval: z.enum(['1m', '5m', '15m', '1h', '1d']),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().nonnegative(),
    vwap: z.number().optional(),
    startTime: timestampSchema,
    endTime: timestampSchema,
    provider: providerMetadataSchema
  })
  .merge(timingSchema);
export type Bar = z.infer<typeof barSchema>;

/**
 * Provider-neutral news item that can be attached to a symbol or broader market.
 */
export const newsItemSchema = z
  .object({
    id: z.string().min(1),
    headline: z.string().min(1),
    summary: z.string().min(1),
    url: urlSchema,
    source: z.string().min(1),
    authors: z.array(z.string()).default([]),
    symbols: z.array(symbolSchema).default([]),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    provider: providerMetadataSchema
  })
  .merge(timingSchema);
export type NewsItem = z.infer<typeof newsItemSchema>;

/**
 * Long-lived descriptive metadata about an issuer or project.
 */
export const companyProfileSchema = z.object({
  symbol: symbolSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  sector: z.string().optional(),
  industry: z.string().optional(),
  websiteUrl: urlSchema.optional(),
  logoUrl: urlSchema.optional(),
  headquarters: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  marketCap: z.number().nonnegative().optional(),
  updatedAt: timestampSchema,
  provider: providerMetadataSchema
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;

/**
 * User-curated list of tracked symbols plus lightweight preferences.
 */
export const watchlistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  symbols: z.array(symbolSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  isDefault: z.boolean().default(false)
});
export type Watchlist = z.infer<typeof watchlistSchema>;

/**
 * Alert definition stored by the platform. The expression surface is purposely
 * small for now so evaluation stays provider-neutral.
 */
export const alertRuleSchema = z.object({
  id: z.string().min(1),
  watchlistId: z.string().min(1).optional(),
  symbol: symbolSchema,
  field: z.enum(['price', 'changePercent', 'dayVolume']),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'crossesAbove', 'crossesBelow']),
  threshold: z.number(),
  enabled: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  lastTriggeredAt: timestampSchema.optional()
});
export type AlertRule = z.infer<typeof alertRuleSchema>;

/**
 * Operational status for a provider adapter or upstream vendor dependency.
 */
export const providerHealthSchema = z.object({
  providerId: z.string().min(1),
  providerName: z.string().min(1),
  status: z.enum(['healthy', 'degraded', 'down']),
  realtimeAvailable: z.boolean(),
  snapshotAvailable: z.boolean(),
  lastCheckedAt: timestampSchema,
  lastSuccessAt: timestampSchema.optional(),
  latencyMs: z.number().nonnegative().optional(),
  message: z.string().optional()
});
export type ProviderHealth = z.infer<typeof providerHealthSchema>;

/**
 * System-level health payload used by placeholder services today and likely
 * by service discovery or diagnostics endpoints later.
 */
export const healthResponseSchema = z.object({
  service: z.string().min(1),
  status: z.literal('ok'),
  timestamp: timestampSchema
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/**
 * Snapshot response used by the current API mock endpoint.
 */
export const quoteSnapshotResponseSchema = z.object({
  data: z.array(quoteSchema),
  generatedAt: timestampSchema,
  providerHealth: providerHealthSchema.optional()
});
export type QuoteSnapshotResponse = z.infer<typeof quoteSnapshotResponseSchema>;

/**
 * Stream events carry canonical entities plus minimal envelope metadata so
 * consumers can fan out updates without learning vendor-specific payloads.
 */
export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('quote.updated'),
    eventId: z.string().min(1),
    emittedAt: timestampSchema,
    payload: quoteSchema
  }),
  z.object({
    type: z.literal('trade.printed'),
    eventId: z.string().min(1),
    emittedAt: timestampSchema,
    payload: tradeSchema
  }),
  z.object({
    type: z.literal('bar.closed'),
    eventId: z.string().min(1),
    emittedAt: timestampSchema,
    payload: barSchema
  }),
  z.object({
    type: z.literal('news.published'),
    eventId: z.string().min(1),
    emittedAt: timestampSchema,
    payload: newsItemSchema
  }),
  z.object({
    type: z.literal('provider.health'),
    eventId: z.string().min(1),
    emittedAt: timestampSchema,
    payload: providerHealthSchema
  }),
  z.object({
    type: z.literal('system.heartbeat'),
    eventId: z.string().min(1),
    emittedAt: timestampSchema,
    payload: z.object({
      service: z.string().min(1),
      timestamp: timestampSchema
    })
  })
]);
export type StreamEvent = z.infer<typeof streamEventSchema>;

export const parseQuote = (input: unknown): Quote => quoteSchema.parse(input);
export const parseTrade = (input: unknown): Trade => tradeSchema.parse(input);
export const parseBar = (input: unknown): Bar => barSchema.parse(input);
export const parseNewsItem = (input: unknown): NewsItem => newsItemSchema.parse(input);
export const parseCompanyProfile = (input: unknown): CompanyProfile => companyProfileSchema.parse(input);
export const parseSymbol = (input: unknown): Symbol => symbolSchema.parse(input);
export const parseExchange = (input: unknown): Exchange => exchangeSchema.parse(input);
export const parseMarketStatus = (input: unknown): MarketStatus => marketStatusSchema.parse(input);
export const parseWatchlist = (input: unknown): Watchlist => watchlistSchema.parse(input);
export const parseAlertRule = (input: unknown): AlertRule => alertRuleSchema.parse(input);
export const parseProviderHealth = (input: unknown): ProviderHealth => providerHealthSchema.parse(input);
export const parseStreamEvent = (input: unknown): StreamEvent => streamEventSchema.parse(input);
