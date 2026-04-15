# Architecture

## Goals

The platform needs to support:

- A public-facing market tracker website.
- A local self-hosted dashboard.
- Near real-time quote updates within provider rate and streaming limits.
- Extensible provider integrations without coupling the core platform to any one vendor.

This first scaffold intentionally stays small. The goal is to create clean seams for the next iteration, not to prematurely build a full event-driven platform.

## Architectural Choices

### Monorepo: `pnpm` workspaces

This repo uses `pnpm` workspaces.

- `pnpm` keeps installs fast and deterministic in multi-package repos.
- Shared packages can be versioned and consumed locally without publishing.
- Native recursive workspace scripts keep the first scaffold simple and avoid extra orchestration until it is genuinely needed.

### Frontend: Next.js

`apps/web` uses Next.js because it gives us:

- A productive TypeScript-first frontend baseline.
- The ability to support SSR, SSG, or hybrid rendering later.
- A realistic path to extracting a static-compatible frontend later if GitHub Pages becomes a hard requirement.

GitHub Pages friendliness is a future concern, not the primary one today. If static export becomes mandatory, we can either:

- constrain the public site to static export, or
- split a static marketing surface from the richer authenticated dashboard.

### Backend: lightweight TypeScript Node services

For the MVP scaffold, `apps/api` and `apps/stream` are plain TypeScript Node services using Fastify.

Why not introduce NestJS immediately?

- The first milestone is simply to get clean process boundaries and runnable services.
- Fastify keeps bootstrap code tiny and easy to reason about.
- We preserve a straightforward path to NestJS later if the service layer grows in complexity and would benefit from more formal module structure.

This keeps the whole monorepo in TypeScript, which reduces integration friction with shared contracts and SDKs.

### Streaming Layer

The streaming service is separate from the API from day one.

- The API can focus on CRUD, configuration, watchlists, snapshots, and admin concerns.
- The stream service can focus on quote fan-out and transport concerns.
- Later, both services can consume a common Redis pub/sub channel or a dedicated broker.

In the current scaffold, the stream service emits mock quote events on a timer so the process boundary exists and can be tested.

### Shared Contracts

`packages/contracts` defines shared domain types.

This package exists now to avoid ad hoc drift between frontend models, API responses, stream events, and future SDK consumers. The rule should be:

- transport shapes live in `packages/contracts`
- implementation details stay inside each app/service

### Provider Abstraction

`services/ingest-provider-template` defines the first provider adapter interface.

Why put this in `services/` instead of `packages/`?

- It represents a runnable integration concern rather than a generic library.
- It gives us a home for future provider-specific adapters and polling/websocket ingestion workers.
- The folder can evolve into one or more provider services without breaking the current layout.

The abstraction is intentionally small:

- provider metadata
- quote subscription interest
- snapshot fetch
- optional lifecycle hooks

That is enough to start wiring one real provider later without overcommitting to a plugin runtime too early.

## Intended Runtime Flow

### Today

1. A provider adapter will eventually fetch or subscribe to quotes.
2. `apps/api` exposes stub endpoints and will become the configuration/query layer.
3. `apps/stream` fans out mock quote messages to connected clients.
4. `apps/web` renders the dashboard shell and will subscribe to the stream later.

### Near-Term Evolution

1. Add a real provider implementation under `services/ingest-provider-template`.
2. Publish normalized quote updates into Redis.
3. Let `apps/stream` subscribe to Redis and broadcast to browser clients.
4. Let `apps/api` persist watchlists, provider configs, and historical snapshots in PostgreSQL.
5. Move common validation and env parsing into `packages/config` and `packages/sdk` as those needs become real.

## Storage Strategy

### PostgreSQL

PostgreSQL is the durable source of truth for:

- watchlists
- provider configuration
- alert definitions
- user settings
- historical snapshots and aggregation metadata

### Redis

Redis is optional at the beginning but included now because it is likely useful very soon for:

- quote cache
- pub/sub between ingestion and stream fan-out
- transient rate-limit coordination

The scaffold includes Redis in Docker Compose, but the placeholder services do not depend on it yet.

## Design Principles

- Keep shared types centralized.
- Keep runtime responsibilities separate.
- Add infrastructure only when a real workflow needs it.
- Prefer explicit TODO seams over speculative abstraction.

## TODO

- Add persistence layer and migrations.
- Add one real market data provider.
- Decide on auth model once the first dashboard workflows exist.
- Decide whether the public site and self-hosted dashboard remain one Next.js app or split into separate frontends.
