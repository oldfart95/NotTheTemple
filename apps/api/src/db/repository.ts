import type { Pool } from 'pg';
import { watchlistSchema, type CompanyProfile, type Symbol, type Watchlist } from '@market-tracker/contracts';
import { conflict, notFound } from '../errors';

type WatchlistRow = {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type WatchlistSymbolRow = {
  watchlist_id: string;
  symbol_data: Symbol;
};

const mapWatchlists = (watchlistRows: WatchlistRow[], symbolRows: WatchlistSymbolRow[]): Watchlist[] =>
  watchlistRows.map((watchlistRow) =>
    watchlistSchema.parse({
      id: watchlistRow.id,
      name: watchlistRow.name,
      symbols: symbolRows
        .filter((symbolRow) => symbolRow.watchlist_id === watchlistRow.id)
        .map((symbolRow) => symbolRow.symbol_data),
      createdAt: watchlistRow.created_at,
      updatedAt: watchlistRow.updated_at,
      isDefault: watchlistRow.is_default
    })
  );

export class ApiRepository {
  constructor(private readonly db: Pool) {}

  async ensureSchema(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS symbol_cache (
        ticker TEXT PRIMARY KEY,
        symbol_data JSONB NOT NULL,
        profile_data JSONB,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS watchlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
    `);

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS watchlist_symbols (
        watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
        symbol_ticker TEXT NOT NULL REFERENCES symbol_cache(ticker),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (watchlist_id, symbol_ticker)
      );
    `);
  }

  async seedMetadata(symbols: Symbol[], profiles: CompanyProfile[]): Promise<void> {
    for (const symbol of symbols) {
      const profile = profiles.find((candidate) => candidate.symbol.ticker === symbol.ticker) ?? null;

      await this.db.query(
        `
          INSERT INTO symbol_cache (ticker, symbol_data, profile_data, updated_at)
          VALUES ($1, $2::jsonb, $3::jsonb, NOW())
          ON CONFLICT (ticker)
          DO UPDATE SET
            symbol_data = EXCLUDED.symbol_data,
            profile_data = EXCLUDED.profile_data,
            updated_at = NOW();
        `,
        [symbol.ticker, JSON.stringify(symbol), profile ? JSON.stringify(profile) : null]
      );
    }
  }

  async seedWatchlist(seed: { id: string; name: string; isDefault?: boolean; symbols: string[] }): Promise<void> {
    const timestamp = new Date().toISOString();

    await this.db.query(
      `
        INSERT INTO watchlists (id, name, is_default, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $4)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          is_default = EXCLUDED.is_default,
          updated_at = EXCLUDED.updated_at;
      `,
      [seed.id, seed.name, seed.isDefault ?? false, timestamp]
    );

    for (const ticker of seed.symbols) {
      await this.db.query(
        `
          INSERT INTO watchlist_symbols (watchlist_id, symbol_ticker)
          VALUES ($1, $2)
          ON CONFLICT (watchlist_id, symbol_ticker) DO NOTHING;
        `,
        [seed.id, ticker]
      );
    }
  }

  async searchSymbols(query: string): Promise<Symbol[]> {
    const result = await this.db.query<{ symbol_data: Symbol }>(
      `
        SELECT symbol_data
        FROM symbol_cache
        WHERE ticker ILIKE $1
          OR symbol_data->>'displayName' ILIKE $1
        ORDER BY ticker ASC
        LIMIT 20;
      `,
      [`%${query}%`]
    );

    return result.rows.map((row) => row.symbol_data);
  }

  async getSymbol(ticker: string): Promise<Symbol | null> {
    const result = await this.db.query<{ symbol_data: Symbol }>(
      `SELECT symbol_data FROM symbol_cache WHERE ticker = $1 LIMIT 1;`,
      [ticker]
    );

    return result.rows[0]?.symbol_data ?? null;
  }

  async getProfile(ticker: string): Promise<CompanyProfile | null> {
    const result = await this.db.query<{ profile_data: CompanyProfile | null }>(
      `SELECT profile_data FROM symbol_cache WHERE ticker = $1 LIMIT 1;`,
      [ticker]
    );

    return result.rows[0]?.profile_data ?? null;
  }

  async listWatchlists(): Promise<Watchlist[]> {
    const [watchlistsResult, symbolsResult] = await Promise.all([
      this.db.query<WatchlistRow>(`SELECT * FROM watchlists ORDER BY is_default DESC, name ASC;`),
      this.db.query<WatchlistSymbolRow>(
        `
          SELECT ws.watchlist_id, sc.symbol_data
          FROM watchlist_symbols ws
          JOIN symbol_cache sc ON sc.ticker = ws.symbol_ticker
          ORDER BY ws.created_at ASC;
        `
      )
    ]);

    return mapWatchlists(watchlistsResult.rows, symbolsResult.rows);
  }

  async createWatchlist(input: { id: string; name: string; isDefault: boolean }): Promise<Watchlist> {
    const timestamp = new Date().toISOString();

    if (input.isDefault) {
      await this.db.query(`UPDATE watchlists SET is_default = FALSE, updated_at = NOW() WHERE is_default = TRUE;`);
    }

    await this.db.query(
      `
        INSERT INTO watchlists (id, name, is_default, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $4);
      `,
      [input.id, input.name, input.isDefault, timestamp]
    );

    return watchlistSchema.parse({
      id: input.id,
      name: input.name,
      symbols: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      isDefault: input.isDefault
    });
  }

  async addSymbolToWatchlist(watchlistId: string, ticker: string): Promise<Watchlist> {
    const watchlist = await this.db.query<WatchlistRow>(`SELECT * FROM watchlists WHERE id = $1 LIMIT 1;`, [watchlistId]);

    if (!watchlist.rows[0]) {
      throw notFound(`Watchlist '${watchlistId}' was not found.`);
    }

    const symbol = await this.getSymbol(ticker);
    if (!symbol) {
      throw notFound(`Symbol '${ticker}' was not found.`);
    }

    const existing = await this.db.query(`SELECT 1 FROM watchlist_symbols WHERE watchlist_id = $1 AND symbol_ticker = $2;`, [
      watchlistId,
      ticker
    ]);

    if (existing.rowCount) {
      throw conflict(`Symbol '${ticker}' is already in watchlist '${watchlistId}'.`);
    }

    await this.db.query(`INSERT INTO watchlist_symbols (watchlist_id, symbol_ticker) VALUES ($1, $2);`, [watchlistId, ticker]);
    await this.db.query(`UPDATE watchlists SET updated_at = NOW() WHERE id = $1;`, [watchlistId]);

    return this.getWatchlistByIdOrThrow(watchlistId);
  }

  async removeSymbolFromWatchlist(watchlistId: string, ticker: string): Promise<Watchlist> {
    const watchlist = await this.db.query<WatchlistRow>(`SELECT * FROM watchlists WHERE id = $1 LIMIT 1;`, [watchlistId]);

    if (!watchlist.rows[0]) {
      throw notFound(`Watchlist '${watchlistId}' was not found.`);
    }

    const removed = await this.db.query(`DELETE FROM watchlist_symbols WHERE watchlist_id = $1 AND symbol_ticker = $2;`, [
      watchlistId,
      ticker
    ]);

    if (!removed.rowCount) {
      throw notFound(`Symbol '${ticker}' is not in watchlist '${watchlistId}'.`);
    }

    await this.db.query(`UPDATE watchlists SET updated_at = NOW() WHERE id = $1;`, [watchlistId]);

    return this.getWatchlistByIdOrThrow(watchlistId);
  }

  private async getWatchlistByIdOrThrow(id: string): Promise<Watchlist> {
    const watchlists = await this.listWatchlists();
    const watchlist = watchlists.find((candidate) => candidate.id === id);
    if (!watchlist) {
      throw notFound(`Watchlist '${id}' was not found.`);
    }

    return watchlist;
  }
}
