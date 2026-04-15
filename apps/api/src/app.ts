import crypto from 'node:crypto';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { serviceNames } from '@market-tracker/config';
import {
  apiErrorSchema,
  createWatchlistBodySchema,
  healthResponseSchema,
  marketStatusResponseSchema,
  providerHealthListResponseSchema,
  symbolBarsQuerySchema,
  symbolBarsResponseSchema,
  symbolSearchQuerySchema,
  symbolSearchResponseSchema,
  updateWatchlistSymbolsBodySchema,
  watchlistResponseSchema,
  watchlistsResponseSchema
} from '@market-tracker/contracts';
import { HttpError, badRequest, notFound } from './errors';
import { fixtureMarketStatuses, fixtureProfiles, fixtureProviderHealth, generateFixtureBars } from './fixtures/catalog';
import { ApiRepository } from './db/repository';
import { docsHtml, openApiDocument } from './docs/openapi';

const normalizeTicker = (value: string): string => decodeURIComponent(value).trim().toUpperCase();

export const buildApp = (repository: ApiRepository) => {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send(
        apiErrorSchema.parse({
          error: error.error,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        })
      );
    }

    if (error instanceof ZodError) {
      return reply.status(400).send(
        apiErrorSchema.parse({
          error: 'ValidationError',
          message: 'Request validation failed.',
          statusCode: 400,
          details: error.issues.map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
        })
      );
    }

    request.log.error(error);
    return reply.status(500).send(
      apiErrorSchema.parse({
        error: 'InternalServerError',
        message: 'Unexpected error while handling the request.',
        statusCode: 500,
        details: []
      })
    );
  });

  app.get('/health', async () =>
    healthResponseSchema.parse({
      service: serviceNames.api,
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  );

  app.get('/market/status', async () =>
    marketStatusResponseSchema.parse({
      data: fixtureMarketStatuses,
      generatedAt: new Date().toISOString()
    })
  );

  app.get('/providers/health', async () =>
    providerHealthListResponseSchema.parse({
      data: fixtureProviderHealth,
      generatedAt: new Date().toISOString()
    })
  );

  app.get('/symbols/search', async (request) => {
    const query = symbolSearchQuerySchema.parse(request.query);
    const results = await repository.searchSymbols(query.q);

    return symbolSearchResponseSchema.parse({
      query: query.q,
      data: results
    });
  });

  app.get('/symbols/:symbol/profile', async (request) => {
    const ticker = normalizeTicker((request.params as { symbol: string }).symbol);
    const profile = await repository.getProfile(ticker);

    if (!profile) {
      throw notFound(`No cached profile was found for symbol '${ticker}'.`);
    }

    return profile;
  });

  app.get('/symbols/:symbol/bars', async (request) => {
    const ticker = normalizeTicker((request.params as { symbol: string }).symbol);
    const query = symbolBarsQuerySchema.parse(request.query);
    const symbol = await repository.getSymbol(ticker);

    if (!symbol) {
      throw notFound(`No cached symbol was found for '${ticker}'.`);
    }

    const from = new Date(query.from);
    const to = new Date(query.to);
    const maxBars = 2_000;
    const bars = generateFixtureBars(symbol, query.timeframe, from, to);

    if (bars.length > maxBars) {
      throw badRequest(`Requested range is too large for timeframe '${query.timeframe}'.`, [
        `Please request ${maxBars} bars or fewer.`
      ]);
    }

    return symbolBarsResponseSchema.parse({
      symbol: ticker,
      timeframe: query.timeframe,
      from: query.from,
      to: query.to,
      data: bars,
      generatedAt: new Date().toISOString()
    });
  });

  app.get('/watchlists', async () =>
    watchlistsResponseSchema.parse({
      data: await repository.listWatchlists()
    })
  );

  app.post('/watchlists', async (request, reply) => {
    const body = createWatchlistBodySchema.parse(request.body);
    const watchlist = await repository.createWatchlist({
      id: `watchlist-${crypto.randomUUID()}`,
      name: body.name,
      isDefault: body.isDefault ?? false
    });

    return reply.status(201).send(
      watchlistResponseSchema.parse({
        data: watchlist
      })
    );
  });

  app.post('/watchlists/:id/symbols', async (request) => {
    const watchlistId = (request.params as { id: string }).id;
    const body = updateWatchlistSymbolsBodySchema.parse(request.body);

    return watchlistResponseSchema.parse({
      data: await repository.addSymbolToWatchlist(watchlistId, body.symbol)
    });
  });

  app.delete('/watchlists/:id/symbols/:symbol', async (request) => {
    const params = request.params as { id: string; symbol: string };

    return watchlistResponseSchema.parse({
      data: await repository.removeSymbolFromWatchlist(params.id, normalizeTicker(params.symbol))
    });
  });

  app.get('/docs/openapi.json', async () => openApiDocument);

  app.get('/docs', async (request, reply) => {
    return reply.type('text/html; charset=utf-8').send(docsHtml);
  });

  app.get('/', async () => ({
    name: 'Market Tracker API',
    docs: '/docs',
    openApi: '/docs/openapi.json',
    sampleProfile: fixtureProfiles[0]?.symbol.ticker
  }));

  return app;
};
