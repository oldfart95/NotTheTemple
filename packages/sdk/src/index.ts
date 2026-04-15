import type { QuoteSnapshotResponse } from '@market-tracker/contracts';

export async function fetchQuoteSnapshot(apiBaseUrl: string): Promise<QuoteSnapshotResponse> {
  const response = await fetch(`${apiBaseUrl}/quotes/snapshot`, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Snapshot request failed with status ${response.status}`);
  }

  return (await response.json()) as QuoteSnapshotResponse;
}

// TODO: Add stream client helpers once the WebSocket protocol is stable.
