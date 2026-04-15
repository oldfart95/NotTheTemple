# Market Tracker Platform

Open-source monorepo scaffold for a market tracking web app plus a self-hosted local dashboard. This first pass focuses on clean boundaries, shared contracts, and runnable placeholders rather than feature depth.

## Why This Stack

- **pnpm workspaces**: fast installs, clear package boundaries, and enough built-in workspace orchestration for the current MVP.
- **Next.js for `apps/web`**: strong default choice for a public-facing web frontend and future hybrid static/server rendering needs.
- **TypeScript Node services for `apps/api` and `apps/stream`**: fastest path to a working MVP while keeping the whole monorepo in one language and sharing contracts directly.
- **PostgreSQL + Redis**: PostgreSQL is the system of record; Redis is reserved for low-latency cache and pub/sub fan-out as the platform evolves.

## Monorepo Layout

```text
apps/
  web/                     Next.js frontend
  api/                     REST API placeholder
  stream/                  WebSocket fan-out placeholder
services/
  ingest-provider-template/ Provider adapter contract + mock template
packages/
  contracts/               Shared domain types used across apps
  sdk/                     Future client helpers for external consumers
  config/                  Shared config defaults and env constants
deploy/
  docker/                  Local Docker Compose setup
docs/
  ARCHITECTURE.md          Design notes and evolution path
```

## Current Capabilities

- `apps/web` boots a Next.js dashboard shell.
- `apps/api` boots a Fastify API with health and stub quote endpoints.
- `apps/stream` boots a Fastify WebSocket service that emits mock quote events.
- `packages/contracts` is imported by multiple apps.
- `services/ingest-provider-template` defines the provider abstraction and a mock adapter template.
- Docker Compose starts PostgreSQL, Redis, and all three apps for local development.

## Quick Start

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   corepack pnpm install
   ```

3. Run the whole stack locally:

   ```bash
   corepack pnpm dev
   ```

4. Or run infrastructure with Docker and apps locally:

   ```bash
   corepack pnpm docker:infra
   corepack pnpm dev
   ```

5. Or run everything in Docker:

   ```bash
   corepack pnpm docker:up
   ```

## Useful Commands

```bash
corepack pnpm dev
corepack pnpm build
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm format:write
corepack pnpm docker:up
corepack pnpm docker:down
```

## TODO Markers

- Wire real provider ingestion into `services/ingest-provider-template`.
- Persist quote snapshots and watchlists in PostgreSQL.
- Introduce Redis-backed pub/sub between ingestion and stream fan-out.
- Add auth, tenant boundaries, and plugin loading strategy once the core loop exists.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the reasoning behind the current structure and how it is expected to evolve.
