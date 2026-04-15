# Ingest Provider Template

This package is the starting point for market data vendor adapters. It keeps
the provider contract intentionally small, emits normalized events using
`@market-tracker/contracts`, and includes a runnable mock provider so we can
validate behavior locally before wiring in a real upstream.

## What is included

- `src/provider.ts`: strict provider interface and shared provider metadata
- `src/abstract-provider.ts`: reusable base class with event listeners,
  rate-limit tracking, and reconnection hooks
- `src/mock-provider.ts`: fake provider that emits normalized quote/trade/bar
  events for a small symbol set
- `src/harness.ts`: local CLI harness for validating subscriptions, health
  checks, historical bars, and graceful shutdown

## Run the mock provider

```bash
corepack pnpm --filter @market-tracker/ingest-provider-template mock:harness
```

The harness will:

- connect the mock provider
- subscribe to a couple of symbols
- print normalized quote, trade, and bar events
- fetch market status, company profile, and historical bars
- print health and capability metadata
- unsubscribe one symbol after a few seconds
- stop cleanly on `Ctrl+C`

## Provider contract

Every provider must implement:

- `connect()`
- `disconnect()`
- `subscribeSymbols(symbols)`
- `unsubscribeSymbols(symbols)`
- `fetchHistoricalBars(symbol, timeframe, from, to)`
- `fetchCompanyProfile(symbol)`
- `fetchMarketStatus()`
- `healthCheck()`

Event output is provider-neutral and should be emitted as `StreamEvent`
instances from `@market-tracker/contracts`. Real providers should normalize raw
vendor payloads at the edge and never leak vendor-shaped messages further into
the app.

## Adding a real provider

1. Copy `src/mock-provider.ts` to `src/<vendor>-provider.ts`.
2. Keep `descriptor.capabilities` honest so downstream services can branch on
   supported features without probing the provider.
3. Convert vendor payloads into contract types with the parsers from
   `@market-tracker/contracts`, for example `parseQuote`, `parseTrade`, and
   `parseBar`.
4. Use `setRateLimitMetadata()` whenever vendor headers or SDK callbacks expose
   quota state.
5. Call `handleConnectionError()` from stream/socket failure paths so the
   reconnection strategy hooks stay centralized.
6. Clear sockets, timers, and subscriptions in `disconnect()` so shutdown is
   graceful.

## Design notes

- Keep the provider interface minimal: the rest of the platform should not need
  vendor-specific methods.
- Prefer canonical `Symbol` objects from `@market-tracker/contracts`.
- Use ISO timestamps for fetch windows and emitted event metadata.
- Add new capability flags only when a real downstream use case needs them.
