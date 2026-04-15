import type { ReactNode } from 'react';
import { DEFAULT_WATCHLIST } from '@market-tracker/contracts';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL ?? 'ws://localhost:4010/ws';

export default function HomePage() {
  return (
    <main
      style={{
        display: 'grid',
        gap: '1.5rem',
        padding: '3rem 1.5rem',
        maxWidth: '960px',
        margin: '0 auto'
      }}
    >
      <section
        style={{
          padding: '1.5rem',
          borderRadius: '1rem',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <p style={{ margin: 0, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Initial Scaffold
        </p>
        <h1 style={{ marginBottom: '0.75rem' }}>Market tracker platform</h1>
        <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.6 }}>
          This is the first monorepo cut: a Next.js frontend, a REST API, a streaming service, shared TypeScript
          contracts, and a provider template ready for the next prompt.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        <Card title="Web">Next.js dashboard shell for public and self-hosted UX.</Card>
        <Card title="API">Fastify HTTP service for configuration and snapshot queries.</Card>
        <Card title="Stream">WebSocket fan-out process for live quote delivery.</Card>
      </section>

      <section
        style={{
          padding: '1.5rem',
          borderRadius: '1rem',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          background: 'rgba(2, 6, 23, 0.7)'
        }}
      >
        <h2 style={{ marginTop: 0 }}>Default Watchlist</h2>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cbd5e1' }}>
          {DEFAULT_WATCHLIST.map((instrument) => (
            <li key={instrument.id}>
              {instrument.ticker} ({instrument.assetType}) via {instrument.exchange.mic} / {instrument.providerId}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: '1rem', color: '#94a3b8' }}>API: {apiBaseUrl}</p>
        <p style={{ marginTop: '0.5rem', color: '#94a3b8' }}>Stream: {streamUrl}</p>
      </section>
    </main>
  );
}

function Card({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <article
      style={{
        padding: '1.25rem',
        borderRadius: '1rem',
        background: 'rgba(17, 24, 39, 0.9)',
        border: '1px solid rgba(34, 197, 94, 0.18)'
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.6 }}>{children}</p>
    </article>
  );
}
