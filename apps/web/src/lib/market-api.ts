import {
  DEFAULT_WATCHLIST,
  sampleMarketStatus,
  sampleProviderHealth,
  type Bar,
  type CompanyProfile,
  type MarketStatus,
  type ProviderHealth,
  type Symbol,
  type Watchlist
} from '@market-tracker/contracts';

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
};

const now = () => new Date().toISOString();

export const fallbackWatchlist: Watchlist = {
  id: 'local-core',
  name: 'Core Tape',
  symbols: [...DEFAULT_WATCHLIST],
  createdAt: now(),
  updatedAt: now(),
  isDefault: true
};

export const fallbackSymbols: Symbol[] = [...DEFAULT_WATCHLIST];

export const fetchWatchlists = async (): Promise<Watchlist[]> => {
  const payload = await request<{ data: Watchlist[] }>('/watchlists');
  return payload.data;
};

export const addSymbolToWatchlist = async (watchlistId: string, symbol: string): Promise<Watchlist> => {
  const payload = await request<{ data: Watchlist }>(`/watchlists/${watchlistId}/symbols`, {
    method: 'POST',
    body: JSON.stringify({ symbol })
  });
  return payload.data;
};

export const removeSymbolFromWatchlist = async (watchlistId: string, symbol: string): Promise<Watchlist> => {
  const payload = await request<{ data: Watchlist }>(`/watchlists/${watchlistId}/symbols/${encodeURIComponent(symbol)}`, {
    method: 'DELETE'
  });
  return payload.data;
};

export const searchSymbols = async (query: string): Promise<Symbol[]> => {
  const payload = await request<{ data: Symbol[] }>(`/symbols/search?q=${encodeURIComponent(query)}`);
  return payload.data;
};

export const fetchProfile = async (symbol: string): Promise<CompanyProfile> =>
  request<CompanyProfile>(`/symbols/${encodeURIComponent(symbol)}/profile`);

export const fetchBars = async (symbol: string, timeframe = '1m'): Promise<Bar[]> => {
  const to = new Date();
  const from = new Date(to.getTime() - 60 * 60 * 1000);
  const params = new URLSearchParams({
    timeframe,
    from: from.toISOString(),
    to: to.toISOString()
  });
  const payload = await request<{ data: Bar[] }>(`/symbols/${encodeURIComponent(symbol)}/bars?${params.toString()}`);
  return payload.data;
};

export const fetchMarketStatuses = async (): Promise<MarketStatus[]> => {
  const payload = await request<{ data: MarketStatus[] }>('/market/status');
  return payload.data;
};

export const fetchProviderHealth = async (): Promise<ProviderHealth[]> => {
  const payload = await request<{ data: ProviderHealth[] }>('/providers/health');
  return payload.data;
};

export const fallbackMarketStatuses: MarketStatus[] = [sampleMarketStatus];
export const fallbackProviderHealth: ProviderHealth[] = [sampleProviderHealth];
