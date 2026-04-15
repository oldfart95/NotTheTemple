export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Market Tracker API',
    version: '0.1.0',
    description: 'REST API for watchlists, symbol metadata, historical bars, market status, and provider health.'
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
  tags: [
    { name: 'system' },
    { name: 'market' },
    { name: 'providers' },
    { name: 'symbols' },
    { name: 'watchlists' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['system'],
        summary: 'Service health check'
      }
    },
    '/market/status': {
      get: {
        tags: ['market'],
        summary: 'Get current market session status by venue'
      }
    },
    '/providers/health': {
      get: {
        tags: ['providers'],
        summary: 'Get upstream provider health'
      }
    },
    '/symbols/search': {
      get: {
        tags: ['symbols'],
        summary: 'Search cached symbols',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }]
      }
    },
    '/symbols/{symbol}/profile': {
      get: {
        tags: ['symbols'],
        summary: 'Get the cached profile for a symbol',
        parameters: [{ name: 'symbol', in: 'path', required: true, schema: { type: 'string' } }]
      }
    },
    '/symbols/{symbol}/bars': {
      get: {
        tags: ['symbols'],
        summary: 'Get fixture-backed historical bars',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'timeframe', in: 'query', required: true, schema: { type: 'string', enum: ['1m', '5m', '15m', '1h', '1d'] } },
          { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date-time' } }
        ]
      }
    },
    '/watchlists': {
      get: {
        tags: ['watchlists'],
        summary: 'List watchlists'
      },
      post: {
        tags: ['watchlists'],
        summary: 'Create a watchlist'
      }
    },
    '/watchlists/{id}/symbols': {
      post: {
        tags: ['watchlists'],
        summary: 'Add a symbol to a watchlist',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }]
      }
    },
    '/watchlists/{id}/symbols/{symbol}': {
      delete: {
        tags: ['watchlists'],
        summary: 'Remove a symbol from a watchlist',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } }
        ]
      }
    }
  }
} as const;

export const docsHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Market Tracker API Docs</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f1e8;
        --panel: #fffaf2;
        --ink: #1e2a2f;
        --muted: #5f6d73;
        --accent: #0b7285;
        --border: #d9cdb8;
      }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        background: radial-gradient(circle at top, #fffaf2 0%, var(--bg) 55%, #ece1cb 100%);
        color: var(--ink);
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 48px 20px 64px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 24px;
        box-shadow: 0 18px 50px rgba(30, 42, 47, 0.08);
      }
      h1, h2 {
        margin: 0 0 16px;
      }
      p {
        color: var(--muted);
        line-height: 1.6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      th, td {
        text-align: left;
        padding: 12px 10px;
        border-top: 1px solid var(--border);
        vertical-align: top;
      }
      .method {
        font-weight: 700;
        color: var(--accent);
      }
      a {
        color: var(--accent);
      }
      code {
        font-family: Consolas, monospace;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>Market Tracker API</h1>
        <p>Development-ready REST service for watchlists, market metadata, cached profiles, and fixture-backed historical bars.</p>
        <p>OpenAPI JSON: <a href="/docs/openapi.json">/docs/openapi.json</a></p>
        <h2>Endpoints</h2>
        <table>
          <thead>
            <tr><th>Method</th><th>Path</th><th>Summary</th></tr>
          </thead>
          <tbody>
            <tr><td class="method">GET</td><td><code>/health</code></td><td>Service health check.</td></tr>
            <tr><td class="method">GET</td><td><code>/market/status</code></td><td>Current venue session status.</td></tr>
            <tr><td class="method">GET</td><td><code>/providers/health</code></td><td>Mock provider and cache health.</td></tr>
            <tr><td class="method">GET</td><td><code>/symbols/search?q=AAPL</code></td><td>Search symbols from cached metadata.</td></tr>
            <tr><td class="method">GET</td><td><code>/symbols/AAPL/profile</code></td><td>Load a symbol profile from cached metadata.</td></tr>
            <tr><td class="method">GET</td><td><code>/symbols/AAPL/bars?timeframe=1m&from=2026-04-14T13:00:00.000Z&to=2026-04-14T14:00:00.000Z</code></td><td>Get historical bars from fixture data.</td></tr>
            <tr><td class="method">GET</td><td><code>/watchlists</code></td><td>List persisted watchlists.</td></tr>
            <tr><td class="method">POST</td><td><code>/watchlists</code></td><td>Create a watchlist with a JSON body.</td></tr>
            <tr><td class="method">POST</td><td><code>/watchlists/:id/symbols</code></td><td>Add a symbol to a watchlist.</td></tr>
            <tr><td class="method">DELETE</td><td><code>/watchlists/:id/symbols/:symbol</code></td><td>Remove a symbol from a watchlist.</td></tr>
          </tbody>
        </table>
      </div>
    </main>
  </body>
</html>`;
