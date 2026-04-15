# Event Model

The contracts package defines a canonical stream event model so the rest of the
platform can react to market activity without learning each vendor's message
shape.

## Why this exists

Different providers disagree on:

- naming conventions for symbols and exchanges
- whether timestamps represent event time, publish time, or receive time
- whether a payload is real-time, delayed, or mixed
- how quotes, trades, and bars are embedded or nested

If the platform passed vendor payloads through directly, every consumer would
need provider-specific conditionals. That would make the API, stream service,
frontend, alerts, and storage layer harder to evolve.

The canonical event model fixes that by enforcing:

- one normalized symbol model
- one normalized quote/trade/bar/news shape
- explicit provider metadata
- explicit `sourceTime` and `ingestTime`
- explicit delayed vs real-time semantics via provider metadata

## Envelope rules

Every `StreamEvent` has:

- `type`: the domain event category
- `eventId`: a stable identifier for de-duplication or tracing
- `emittedAt`: when our platform published the normalized event
- `payload`: the canonical domain object

This means downstream consumers can branch only on event type and then parse a
stable payload shape.

## Current event types

- `quote.updated`: latest normalized quote snapshot for a symbol
- `trade.printed`: last-sale trade update
- `bar.closed`: OHLCV interval close
- `market.status`: normalized venue/session status update
- `news.published`: normalized news item
- `provider.health`: upstream provider status change or health pulse
- `system.heartbeat`: lightweight stream liveness signal

## Design notes

- The event model is intentionally domain-shaped, not transport-shaped.
- Provider-specific raw payloads should stay at the ingestion edge.
- The stream layer should fan out canonical events, not vendor blobs.
- Storage can persist these shapes directly or derive secondary tables from them.

## TODO

- Add sequence or cursor semantics once replay/backfill is implemented.
- Add alert trigger events once rule evaluation moves into the platform.
- Add order book depth events only if a provider and use case requires them.
