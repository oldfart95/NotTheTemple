'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Bar, GatewayServerMessage, MarketStatus, ProviderHealth, Quote, Trade } from '@market-tracker/contracts';

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
