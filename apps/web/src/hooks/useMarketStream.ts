'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_WATCHLIST,
  sampleMarketStatus,
  sampleProviderMetadata,
  type Bar,
  type GatewayServerMessage,
  type MarketStatus,
  type ProviderHealth,
  type Quote,
  type Trade
} from '@market-tracker/contracts';

export type StreamState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type StreamDebugEvent = {
  id: string;
  label: string;
  timestamp: string;
};

export type StreamSnapshot = {
  quotes: Record<string, Quote>;
  bars: Record<string, Bar[]>;
  trades: Record<string, Trade>;
  marketStatus?: MarketStatus;
  providerHealth?: ProviderHealth;
  status: StreamState;
  lastMessageAt?: string;
  error?: string;
  events: StreamDebugEvent[];
  reconnect: () => void;
};

const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL ?? 'ws://localhost:4010/ws';
const symbolCatalog = new Map(DEFAULT_WATCHLIST.map((symbol) => [symbol.ticker, symbol]));

const appendEvent = (events: StreamDebugEvent[], label: string): StreamDebugEvent[] =>
  [
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      timestamp: new Date().toISOString()
    },
    ...events
  ].slice(0, 12);

export function useMarketStream(symbols: string[]): StreamSnapshot {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [bars, setBars] = useState<Record<string, Bar[]>>({});
  const [trades, setTrades] = useState<Record<string, Trade>>({});
  const [marketStatus, setMarketStatus] = useState<MarketStatus>();
  const [providerHealth, setProviderHealth] = useState<ProviderHealth>();
  const [status, setStatus] = useState<StreamState>('connecting');
  const [lastMessageAt, setLastMessageAt] = useState<string>();
  const [error, setError] = useState<string>();
  const [events, setEvents] = useState<StreamDebugEvent[]>([]);
  const [generation, setGeneration] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);

  const symbolKey = useMemo(() => symbols.map((symbol) => symbol.toUpperCase()).sort().join('|'), [symbols]);

  useEffect(() => {
    const activeSymbols = symbolKey ? symbolKey.split('|') : [];
    const shouldUseBrowserMock = streamUrl === 'mock';

    if (shouldUseBrowserMock) {
      setStatus('connected');
      setError(undefined);
      setEvents((current) => appendEvent(current, `Started browser mock stream for ${activeSymbols.join(', ')}`));

      const interval = setInterval(() => {
        const receivedAt = new Date().toISOString();
        setLastMessageAt(receivedAt);
        setMarketStatus({
          ...sampleMarketStatus,
          asOf: receivedAt,
          reason: 'Static Pages browser mock stream is active.'
        });

        for (const [index, ticker] of activeSymbols.entries()) {
          const symbol = symbolCatalog.get(ticker);
          if (!symbol) {
            continue;
          }

          const seed = Date.now() / 850 + index * 3;
          const base = ticker === 'MSFT' ? 425 : 189;
          const price = Number((base + Math.sin(seed) * 1.8 + Math.cos(seed / 2) * 0.7).toFixed(2));
          const previousClose = base - 0.65;
          const change = Number((price - previousClose).toFixed(2));
          const changePercent = Number(((change / previousClose) * 100).toFixed(2));
          const provider = {
            ...sampleProviderMetadata,
            providerId: 'browser-mock',
            providerName: 'Browser Mock Stream',
            dataset: 'github-pages-demo',
            realtime: true,
            delayedBySeconds: 0
          };
          const quote: Quote = {
            symbol,
            marketStatus: sampleMarketStatus,
            price,
            currency: symbol.quoteCurrency ?? symbol.baseCurrency,
            change,
            changePercent,
            previousClose,
            open: Number((price - 0.3).toFixed(2)),
            high: Number((price + 0.9).toFixed(2)),
            low: Number((price - 1.1).toFixed(2)),
            dayVolume: 1_200_000 + Math.round(Math.abs(Math.sin(seed)) * 450_000),
            bid: Number((price - 0.01).toFixed(2)),
            ask: Number((price + 0.01).toFixed(2)),
            bidSize: 100 + index,
            askSize: 120 + index,
            sourceTime: receivedAt,
            ingestTime: receivedAt,
            provider
          };
          const bar: Bar = {
            symbol,
            interval: '1m',
            open: Number((price - 0.28).toFixed(2)),
            high: Number((price + 0.42).toFixed(2)),
            low: Number((price - 0.5).toFixed(2)),
            close: price,
            volume: 5_000 + Math.round(Math.abs(Math.cos(seed)) * 1_000),
            startTime: new Date(Date.now() - 60_000).toISOString(),
            endTime: receivedAt,
            sourceTime: receivedAt,
            ingestTime: receivedAt,
            provider
          };

          setQuotes((current) => ({ ...current, [ticker]: quote }));
          setBars((current) => ({ ...current, [ticker]: [...(current[ticker] ?? []), bar].slice(-80) }));
        }
      }, 1_000);

      return () => clearInterval(interval);
    }

    const socket = new WebSocket(streamUrl);
    socketRef.current = socket;

    setStatus('connecting');
    setError(undefined);
    setEvents((current) => appendEvent(current, `Opening stream to ${streamUrl}`));

    socket.addEventListener('open', () => {
      setStatus('connected');
      socket.send(JSON.stringify({ type: 'subscribe', symbols: activeSymbols }));
      setEvents((current) => appendEvent(current, `Subscribed to ${activeSymbols.join(', ') || 'none'}`));
    });

    socket.addEventListener('message', (event) => {
      const receivedAt = new Date().toISOString();
      setLastMessageAt(receivedAt);

      try {
        const message = JSON.parse(event.data as string) as GatewayServerMessage;

        if (message.type === 'heartbeat') {
          setEvents((current) => appendEvent(current, 'Heartbeat received'));
          return;
        }

        if (message.type === 'error') {
          setError(message.message);
          setEvents((current) => appendEvent(current, `Stream error: ${message.message}`));
          return;
        }

        if (message.type === 'subscriptions.updated') {
          setEvents((current) => appendEvent(current, `Active stream symbols: ${message.symbols.join(', ')}`));
          return;
        }

        if (message.type !== 'stream.event') {
          return;
        }

        const streamEvent = message.event;
        setEvents((current) => appendEvent(current, streamEvent.type));

        if (streamEvent.type === 'quote.updated') {
          setQuotes((current) => ({
            ...current,
            [streamEvent.payload.symbol.ticker]: streamEvent.payload
          }));
        }

        if (streamEvent.type === 'trade.printed') {
          setTrades((current) => ({
            ...current,
            [streamEvent.payload.symbol.ticker]: streamEvent.payload
          }));
        }

        if (streamEvent.type === 'bar.closed') {
          setBars((current) => {
            const ticker = streamEvent.payload.symbol.ticker;
            return {
              ...current,
              [ticker]: [...(current[ticker] ?? []), streamEvent.payload].slice(-80)
            };
          });
        }

        if (streamEvent.type === 'market.status') {
          setMarketStatus(streamEvent.payload);
        }

        if (streamEvent.type === 'provider.health') {
          setProviderHealth(streamEvent.payload);
        }
      } catch (streamError) {
        const message = streamError instanceof Error ? streamError.message : 'Unable to parse stream message.';
        setError(message);
        setEvents((current) => appendEvent(current, `Parse error: ${message}`));
      }
    });

    socket.addEventListener('close', () => {
      setStatus('disconnected');
      setEvents((current) => appendEvent(current, 'Stream disconnected'));
    });

    socket.addEventListener('error', () => {
      setStatus('error');
      setError('Stream connection failed.');
      setEvents((current) => appendEvent(current, 'Stream connection failed'));
    });

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'unsubscribe', symbols: activeSymbols }));
      }
      socket.close();
    };
  }, [symbolKey, generation]);

  return {
    quotes,
    bars,
    trades,
    marketStatus,
    providerHealth,
    status,
    lastMessageAt,
    error,
    events,
    reconnect: () => setGeneration((current) => current + 1)
  };
}
