'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Bar, CompanyProfile, MarketStatus, ProviderHealth, Quote, Symbol, Watchlist } from '@market-tracker/contracts';
import { useMarketStream } from '../hooks/useMarketStream';
import {
  addSymbolToWatchlist,
  fallbackMarketStatuses,
  fallbackProviderHealth,
  fallbackSymbols,
  fallbackWatchlist,
  fetchBars,
  fetchMarketStatuses,
  fetchProfile,
  fetchProviderHealth,
  fetchWatchlists,
  removeSymbolFromWatchlist,
  searchSymbols
} from '../lib/market-api';
import { formatCompactNumber, formatPercent, formatPrice, formatSigned, formatTime, timeAgo } from '../lib/format';

type LoadState = 'loading' | 'ready' | 'error';

export function MarketDashboard() {
  const [watchlist, setWatchlist] = useState<Watchlist>(fallbackWatchlist);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [apiError, setApiError] = useState<string>();
  const [selectedSymbol, setSelectedSymbol] = useState(fallbackWatchlist.symbols[0]?.ticker ?? 'AAPL');
  const [profiles, setProfiles] = useState<Record<string, CompanyProfile>>({});
  const [historicalBars, setHistoricalBars] = useState<Record<string, Bar[]>>({});
  const [marketStatuses, setMarketStatuses] = useState<MarketStatus[]>(fallbackMarketStatuses);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>(fallbackProviderHealth);
  const [symbolInput, setSymbolInput] = useState('');
  const [symbolError, setSymbolError] = useState<string>();
  const [pendingSymbol, setPendingSymbol] = useState<string>();
  const [showDebug, setShowDebug] = useState(false);

  const symbols = watchlist.symbols.map((symbol) => symbol.ticker);
  const stream = useMarketStream(symbols);

  useEffect(() => {
    let isMounted = true;

    fetchWatchlists()
      .then((watchlists) => {
        if (!isMounted) {
          return;
        }

        const nextWatchlist = watchlists.find((candidate) => candidate.isDefault) ?? watchlists[0] ?? fallbackWatchlist;
        setWatchlist(nextWatchlist);
        setSelectedSymbol((current) => nextWatchlist.symbols.some((symbol) => symbol.ticker === current) ? current : nextWatchlist.symbols[0]?.ticker ?? current);
        setLoadState('ready');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setApiError(error instanceof Error ? error.message : 'API unavailable; using seeded local watchlist.');
        setLoadState('error');
      });

    Promise.allSettled([fetchMarketStatuses(), fetchProviderHealth()]).then(([statuses, health]) => {
      if (!isMounted) {
        return;
      }

      if (statuses.status === 'fulfilled') {
        setMarketStatuses(statuses.value);
      }

      if (health.status === 'fulfilled') {
        setProviderHealth(health.value);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const ticker = selectedSymbol;
    if (!ticker) {
      return;
    }

    if (!profiles[ticker]) {
      fetchProfile(ticker)
        .then((profile) => setProfiles((current) => ({ ...current, [ticker]: profile })))
        .catch(() => undefined);
    }

    fetchBars(ticker)
      .then((bars) => setHistoricalBars((current) => ({ ...current, [ticker]: bars })))
      .catch(() => undefined);
  }, [profiles, selectedSymbol]);

  const selectedInstrument = useMemo(
    () => watchlist.symbols.find((symbol) => symbol.ticker === selectedSymbol) ?? watchlist.symbols[0] ?? fallbackSymbols[0],
    [selectedSymbol, watchlist.symbols]
  );
  const selectedQuote = stream.quotes[selectedInstrument.ticker];
  const selectedBars = [...(historicalBars[selectedInstrument.ticker] ?? []), ...(stream.bars[selectedInstrument.ticker] ?? [])].slice(-80);
  const selectedProfile = profiles[selectedInstrument.ticker];
  const statusForSelected =
    stream.marketStatus ??
    marketStatuses.find((status) => status.exchange.mic === selectedInstrument.exchange.mic) ??
    marketStatuses[0];
  const activeProviderHealth = stream.providerHealth ? [stream.providerHealth, ...providerHealth] : providerHealth;

  const handleAddSymbol = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ticker = symbolInput.trim().toUpperCase();

    if (!ticker) {
      return;
    }

    setPendingSymbol(ticker);
    setSymbolError(undefined);

    try {
      const [match] = await searchSymbols(ticker);
      if (!match) {
        throw new Error(`No symbol metadata found for ${ticker}.`);
      }

      if (watchlist.symbols.some((symbol) => symbol.ticker === match.ticker)) {
        throw new Error(`${match.ticker} is already tracked.`);
      }

      try {
        const updated = await addSymbolToWatchlist(watchlist.id, match.ticker);
        setWatchlist(updated);
      } catch {
        setWatchlist((current) => ({
          ...current,
          symbols: [...current.symbols, match],
          updatedAt: new Date().toISOString()
        }));
      }

      setSelectedSymbol(match.ticker);
      setSymbolInput('');
    } catch (error) {
      setSymbolError(error instanceof Error ? error.message : 'Unable to add symbol.');
    } finally {
      setPendingSymbol(undefined);
    }
  };

  const handleRemoveSymbol = async (symbol: Symbol) => {
    setSymbolError(undefined);

    try {
      try {
        const updated = await removeSymbolFromWatchlist(watchlist.id, symbol.ticker);
        setWatchlist(updated);
      } catch {
        setWatchlist((current) => ({
          ...current,
          symbols: current.symbols.filter((candidate) => candidate.ticker !== symbol.ticker),
          updatedAt: new Date().toISOString()
        }));
      }

      if (selectedSymbol === symbol.ticker) {
        const next = watchlist.symbols.find((candidate) => candidate.ticker !== symbol.ticker);
        setSelectedSymbol(next?.ticker ?? fallbackSymbols[0]?.ticker ?? 'AAPL');
      }
    } catch (error) {
      setSymbolError(error instanceof Error ? error.message : 'Unable to remove symbol.');
    }
  };

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Market Tracker MVP</p>
          <h1>Live Watchlist Desk</h1>
        </div>
        <div className="topbar-actions">
          <MarketStatusBadge status={statusForSelected} />
          <button className="icon-button" type="button" onClick={() => setShowDebug((current) => !current)} title="Toggle provider debug">
            {showDebug ? 'Hide debug' : 'Debug'}
          </button>
        </div>
      </header>

      <section className="status-strip" aria-live="polite">
        <StatusPill label="Stream" tone={stream.status === 'connected' ? 'good' : stream.status === 'connecting' ? 'warn' : 'bad'} value={stream.status} />
        <StatusPill label="Last tick" tone={stream.lastMessageAt ? 'good' : 'warn'} value={timeAgo(stream.lastMessageAt)} />
        <StatusPill label="REST" tone={loadState === 'ready' ? 'good' : loadState === 'loading' ? 'warn' : 'bad'} value={loadState === 'error' ? 'fallback' : loadState} />
        <StatusPill label="Feed" tone={selectedQuote?.provider.realtime ? 'good' : 'warn'} value={selectedQuote?.provider.realtime ? 'realtime' : 'delayed/mock'} />
      </section>

      {apiError ? <div className="callout">REST API is unavailable, so the dashboard is using the seeded watchlist until the service reconnects.</div> : null}
      {stream.status === 'disconnected' || stream.status === 'error' ? (
        <div className="callout callout-danger">
          Live stream disconnected. Existing quotes remain visible while you reconnect.
          <button type="button" onClick={stream.reconnect}>Reconnect</button>
        </div>
      ) : null}

      <div className="dashboard-grid">
        <WatchlistPanel
          error={symbolError}
          input={symbolInput}
          isPending={Boolean(pendingSymbol)}
          onAdd={handleAddSymbol}
          onInputChange={setSymbolInput}
          onRemove={handleRemoveSymbol}
          onSelect={setSelectedSymbol}
          quotes={stream.quotes}
          selectedSymbol={selectedInstrument.ticker}
          watchlist={watchlist}
        />

        <section className="quote-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Tracked Symbols</p>
              <h2>Live Quote Tiles</h2>
            </div>
            <span>{symbols.length} symbols</span>
          </div>
          <div className="quote-grid">
            {watchlist.symbols.map((symbol) => (
              <QuoteTile
                key={symbol.ticker}
                bars={[...(historicalBars[symbol.ticker] ?? []), ...(stream.bars[symbol.ticker] ?? [])].slice(-40)}
                isSelected={symbol.ticker === selectedInstrument.ticker}
                onSelect={() => setSelectedSymbol(symbol.ticker)}
                quote={stream.quotes[symbol.ticker]}
                symbol={symbol}
              />
            ))}
          </div>
        </section>

        <SymbolDetailPanel
          bars={selectedBars}
          marketStatus={statusForSelected}
          profile={selectedProfile}
          quote={selectedQuote}
          symbol={selectedInstrument}
          trade={stream.trades[selectedInstrument.ticker]}
        />

        {showDebug ? (
          <ProviderDebugPanel
            apiError={apiError}
            events={stream.events}
            providerHealth={activeProviderHealth}
            streamError={stream.error}
            streamStatus={stream.status}
          />
        ) : null}
      </div>
    </main>
  );
}

function WatchlistPanel({
  error,
  input,
  isPending,
  onAdd,
  onInputChange,
  onRemove,
  onSelect,
  quotes,
  selectedSymbol,
  watchlist
}: {
  error?: string;
  input: string;
  isPending: boolean;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onInputChange: (value: string) => void;
  onRemove: (symbol: Symbol) => void;
  onSelect: (ticker: string) => void;
  quotes: Record<string, Quote>;
  selectedSymbol: string;
  watchlist: Watchlist;
}) {
  return (
    <aside className="watchlist-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Watchlist</p>
          <h2>{watchlist.name}</h2>
        </div>
      </div>

      <form className="symbol-form" onSubmit={onAdd}>
        <input
          aria-label="Add symbol"
          placeholder="AAPL, MSFT, NVDA..."
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
        />
        <button type="submit" disabled={isPending}>{isPending ? 'Adding' : 'Add'}</button>
      </form>
      {error ? <p className="field-error">{error}</p> : null}

      <div className="watchlist-items">
        {watchlist.symbols.map((symbol) => {
          const quote = quotes[symbol.ticker];
          return (
            <button
              className={`watchlist-row ${selectedSymbol === symbol.ticker ? 'selected' : ''}`}
              key={symbol.ticker}
              type="button"
              onClick={() => onSelect(symbol.ticker)}
            >
              <span>
                <strong>{symbol.ticker}</strong>
                <small>{symbol.exchange.mic}</small>
              </span>
              <span className={quote && quote.changePercent >= 0 ? 'positive' : 'negative'}>{formatPercent(quote?.changePercent)}</span>
              <span className="remove-symbol" role="button" tabIndex={0} onClick={(event) => {
                event.stopPropagation();
                onRemove(symbol);
              }}>
                Remove
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function QuoteTile({
  bars,
  isSelected,
  onSelect,
  quote,
  symbol
}: {
  bars: Bar[];
  isSelected: boolean;
  onSelect: () => void;
  quote?: Quote;
  symbol: Symbol;
}) {
  const isPositive = (quote?.changePercent ?? 0) >= 0;

  return (
    <button className={`quote-tile ${isSelected ? 'selected' : ''}`} type="button" onClick={onSelect}>
      <span className="tile-topline">
        <strong>{symbol.ticker}</strong>
        <em className={quote?.provider.realtime ? 'realtime' : 'delayed'}>{quote?.provider.realtime ? 'Realtime' : 'Delayed'}</em>
      </span>
      <span className="quote-price">{formatPrice(quote?.price, quote?.currency ?? symbol.quoteCurrency ?? symbol.baseCurrency)}</span>
      <span className={isPositive ? 'positive' : 'negative'}>
        {formatSigned(quote?.change)} {formatPercent(quote?.changePercent)}
      </span>
      <MiniChart bars={bars} tone={isPositive ? 'positive' : 'negative'} />
      <span className="tile-meta">
        <span>Vol {formatCompactNumber(quote?.dayVolume)}</span>
        <span>{quote ? formatTime(quote.sourceTime) : 'Loading quote'}</span>
      </span>
    </button>
  );
}

function SymbolDetailPanel({
  bars,
  marketStatus,
  profile,
  quote,
  symbol,
  trade
}: {
  bars: Bar[];
  marketStatus?: MarketStatus;
  profile?: CompanyProfile;
  quote?: Quote;
  symbol: Symbol;
  trade?: { price: number; size: number; sourceTime: string };
}) {
  const changeTone = (quote?.changePercent ?? 0) >= 0 ? 'positive' : 'negative';

  return (
    <section className="detail-panel">
      <div className="detail-head">
        <div>
          <p className="eyebrow">{symbol.exchange.name}</p>
          <h2>{symbol.ticker}</h2>
          <p>{profile?.name ?? symbol.displayName}</p>
        </div>
        <div className="detail-price">
          <strong>{formatPrice(quote?.price, quote?.currency ?? symbol.quoteCurrency ?? symbol.baseCurrency)}</strong>
          <span className={changeTone}>{formatSigned(quote?.change)} {formatPercent(quote?.changePercent)}</span>
        </div>
      </div>

      <div className="hero-chart">
        <MiniChart bars={bars} tone={changeTone} large />
      </div>

      <dl className="metric-grid">
        <Metric label="Open" value={formatPrice(quote?.open, quote?.currency)} />
        <Metric label="High" value={formatPrice(quote?.high, quote?.currency)} />
        <Metric label="Low" value={formatPrice(quote?.low, quote?.currency)} />
        <Metric label="Volume" value={formatCompactNumber(quote?.dayVolume)} />
        <Metric label="Bid / Ask" value={quote ? `${formatPrice(quote.bid, quote.currency)} / ${formatPrice(quote.ask, quote.currency)}` : '--'} />
        <Metric label="Last Trade" value={trade ? `${formatPrice(trade.price)} x ${trade.size}` : '--'} />
        <Metric label="Provider" value={quote?.provider.providerName ?? 'Waiting'} />
        <Metric label="Session" value={marketStatus ? marketStatus.phase : '--'} />
      </dl>

      <p className="profile-copy">{profile?.description ?? 'Loading symbol metadata from the REST API.'}</p>
    </section>
  );
}

function ProviderDebugPanel({
  apiError,
  events,
  providerHealth,
  streamError,
  streamStatus
}: {
  apiError?: string;
  events: { id: string; label: string; timestamp: string }[];
  providerHealth: ProviderHealth[];
  streamError?: string;
  streamStatus: string;
}) {
  return (
    <section className="debug-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Developer</p>
          <h2>Provider Health</h2>
        </div>
        <span>{streamStatus}</span>
      </div>

      <div className="debug-grid">
        {providerHealth.map((provider) => (
          <article key={`${provider.providerId}-${provider.lastCheckedAt}`} className="debug-card">
            <strong>{provider.providerName}</strong>
            <span className={`health ${provider.status}`}>{provider.status}</span>
            <p>{provider.message}</p>
            <small>{provider.latencyMs ?? '--'}ms latency, realtime {provider.realtimeAvailable ? 'yes' : 'no'}</small>
          </article>
        ))}
      </div>

      <div className="event-log">
        {[streamError, apiError].filter(Boolean).map((message) => (
          <p className="field-error" key={message}>{message}</p>
        ))}
        {events.map((event) => (
          <p key={event.id}>
            <span>{formatTime(event.timestamp)}</span>
            {event.label}
          </p>
        ))}
      </div>
    </section>
  );
}

function MiniChart({ bars, large = false, tone }: { bars: Bar[]; large?: boolean; tone: 'positive' | 'negative' }) {
  const points = useMemo(() => {
    const closes = bars.map((bar) => bar.close);
    if (closes.length < 2) {
      return '';
    }

    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const width = 100;
    const height = 42;

    return closes
      .map((close, index) => {
        const x = (index / (closes.length - 1)) * width;
        const y = height - ((close - min) / range) * (height - 4) - 2;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [bars]);

  return (
    <svg className={`mini-chart ${large ? 'large' : ''} ${tone}`} viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="100" y1="32" y2="32" />
      {points ? <polyline points={points} /> : <text x="50" y="24" textAnchor="middle">Loading</text>}
    </svg>
  );
}

function MarketStatusBadge({ status }: { status?: MarketStatus }) {
  return (
    <div className={`market-badge ${status?.isOpen ? 'open' : 'closed'}`}>
      <span>{status?.isOpen ? 'Open' : 'Closed'}</span>
      <strong>{status?.exchange.mic ?? 'Market'}</strong>
      <small>{status ? `${status.phase} as of ${formatTime(status.asOf)}` : 'status loading'}</small>
    </div>
  );
}

function StatusPill({ label, tone, value }: { label: string; tone: 'good' | 'warn' | 'bad'; value: string }) {
  return (
    <div className={`status-pill ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
