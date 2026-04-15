import type {
  Bar,
  CompanyProfile,
  MarketStatus,
  ProviderHealth,
  StreamEvent,
  Symbol
} from '@market-tracker/contracts';

export type ProviderTimeframe = Bar['interval'];

export type ProviderCapabilities = {
  supportsRealtimeQuotes: boolean;
  supportsTrades: boolean;
  supportsHistoricalBars: boolean;
  supportsNews: boolean;
  supportsCompanyProfiles: boolean;
  supportsPremarket: boolean;
  supportsAfterHours: boolean;
};

export type ProviderRateLimitWindow = {
  name: string;
  limit: number;
  remaining: number;
  windowSeconds: number;
  resetAt: string;
};

export type ProviderRateLimitMetadata = {
  updatedAt: string;
  windows: ProviderRateLimitWindow[];
};

export type ProviderDescriptor = {
  id: string;
  displayName: string;
  capabilities: ProviderCapabilities;
};

export type ReconnectAttemptContext = {
  providerId: string;
  attempt: number;
  error: Error;
  startedAt: string;
};

export type ReconnectScheduledContext = ReconnectAttemptContext & {
  delayMs: number;
};

export type ReconnectFailureContext = ReconnectAttemptContext & {
  willRetry: boolean;
};

export type ReconnectSuccessContext = {
  providerId: string;
  attempts: number;
  reconnectedAt: string;
};

export type ProviderReconnectStrategy = {
  maxAttempts?: number;
  shouldReconnect?(context: ReconnectAttemptContext): boolean;
  getDelayMs?(context: ReconnectAttemptContext): number;
  onReconnectScheduled?(context: ReconnectScheduledContext): void | Promise<void>;
  onReconnectAttempt?(context: ReconnectAttemptContext): void | Promise<void>;
  onReconnectSuccess?(context: ReconnectSuccessContext): void | Promise<void>;
  onReconnectFailure?(context: ReconnectFailureContext): void | Promise<void>;
};

export type ProviderHealthReport = {
  health: ProviderHealth;
  capabilities: ProviderCapabilities;
  rateLimits?: ProviderRateLimitMetadata;
};

export type MarketDataProviderOptions = {
  reconnectStrategy?: ProviderReconnectStrategy;
};

export type ProviderEventListener = (event: StreamEvent) => void;

export interface MarketDataProvider {
  readonly descriptor: ProviderDescriptor;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribeSymbols(symbols: Symbol[]): Promise<void>;
  unsubscribeSymbols(symbols: Symbol[]): Promise<void>;
  fetchHistoricalBars(symbol: Symbol, timeframe: ProviderTimeframe, from: string, to: string): Promise<Bar[]>;
  fetchCompanyProfile(symbol: Symbol): Promise<CompanyProfile>;
  fetchMarketStatus(): Promise<MarketStatus>;
  healthCheck(): Promise<ProviderHealthReport>;
  getRateLimitMetadata(): ProviderRateLimitMetadata | undefined;
  onEvent(listener: ProviderEventListener): () => void;
}
