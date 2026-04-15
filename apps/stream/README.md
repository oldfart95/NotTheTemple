# Stream Gateway

This service receives normalized market events and fans them out to connected
clients over WebSocket. The MVP keeps the design small: one event source, one
subscription-aware client registry, and one transport adapter.

## Features

- uses `@market-tracker/contracts` for stream events and client/server messages
- fans out normalized `quote.updated`, `trade.printed`, `bar.closed`, and
  `market.status` events
- tracks symbol subscriptions per client
- sends WebSocket heartbeats and application-level `heartbeat` / `pong`
- exposes `GET /health` and `GET /health/details`
- logs connections, subscription updates, and dropped clients
- keeps event source and transport logic separate so another transport like SSE
  can be added without rewriting subscription filtering

## Endpoints

- `GET /health`
- `GET /health/details`
- `GET /ws`

## Client protocol

Send JSON messages to `/ws`:

```json
{ "type": "subscribe", "symbols": ["AAPL", "MSFT"] }
```

```json
{ "type": "unsubscribe", "symbols": ["MSFT"] }
```

```json
{ "type": "ping" }
```

Server messages include:

- `welcome`
- `subscriptions.updated`
- `stream.event`
- `heartbeat`
- `pong`
- `error`

## Local development

```bash
corepack pnpm --filter @market-tracker/stream dev
```

Example client:

```bash
corepack pnpm --filter @market-tracker/stream client:example
```

Smoke test:

```bash
corepack pnpm --filter @market-tracker/stream test:smoke
```

## Mock event source

The service uses the mock provider from
`@market-tracker/ingest-provider-template` and subscribes it to a few symbols on
startup. The provider already emits normalized quote, trade, and bar events; the
stream app adds periodic `market.status` events on top.
