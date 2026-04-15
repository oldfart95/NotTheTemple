import { z } from 'zod';
import {
  barIntervalSchema,
  barSchema,
  companyProfileSchema,
  healthResponseSchema,
  marketStatusSchema,
  providerHealthSchema,
  symbolSchema,
  watchlistSchema
} from './domain';

const timestampSchema = z.string().datetime({ offset: true });

export const apiErrorSchema = z.object({
  error: z.string().min(1),
  message: z.string().min(1),
  statusCode: z.number().int().positive(),
  details: z.array(z.string()).default([])
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const marketStatusResponseSchema = z.object({
  data: z.array(marketStatusSchema),
  generatedAt: timestampSchema
});
export type MarketStatusResponse = z.infer<typeof marketStatusResponseSchema>;

export const providerHealthListResponseSchema = z.object({
  data: z.array(providerHealthSchema),
  generatedAt: timestampSchema
});
export type ProviderHealthListResponse = z.infer<typeof providerHealthListResponseSchema>;

export const symbolSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query is required').max(50, 'Query must be 50 characters or fewer')
});
export type SymbolSearchQuery = z.infer<typeof symbolSearchQuerySchema>;

export const symbolSearchResponseSchema = z.object({
  query: z.string().min(1),
  data: z.array(symbolSchema)
});
export type SymbolSearchResponse = z.infer<typeof symbolSearchResponseSchema>;

export const symbolBarsQuerySchema = z
  .object({
    timeframe: barIntervalSchema.default('1m'),
    from: timestampSchema,
    to: timestampSchema
  })
  .superRefine((value, ctx) => {
    if (new Date(value.from) >= new Date(value.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '`from` must be earlier than `to`',
        path: ['from']
      });
    }
  });
export type SymbolBarsQuery = z.infer<typeof symbolBarsQuerySchema>;

export const symbolBarsResponseSchema = z.object({
  symbol: z.string().min(1),
  timeframe: barIntervalSchema,
  from: timestampSchema,
  to: timestampSchema,
  data: z.array(barSchema),
  generatedAt: timestampSchema
});
export type SymbolBarsResponse = z.infer<typeof symbolBarsResponseSchema>;

export const watchlistsResponseSchema = z.object({
  data: z.array(watchlistSchema)
});
export type WatchlistsResponse = z.infer<typeof watchlistsResponseSchema>;

export const watchlistResponseSchema = z.object({
  data: watchlistSchema
});
export type WatchlistResponse = z.infer<typeof watchlistResponseSchema>;

export const createWatchlistBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer'),
  isDefault: z.boolean().optional()
});
export type CreateWatchlistBody = z.infer<typeof createWatchlistBodySchema>;

export const updateWatchlistSymbolsBodySchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, 'Symbol is required')
    .max(32, 'Symbol must be 32 characters or fewer')
    .transform((value) => value.toUpperCase())
});
export type UpdateWatchlistSymbolsBody = z.infer<typeof updateWatchlistSymbolsBodySchema>;

export const openApiInfoSchema = z.object({
  title: z.string().min(1),
  version: z.string().min(1)
});
export type OpenApiInfo = z.infer<typeof openApiInfoSchema>;

export const serviceDocsResponseSchema = z.object({
  info: openApiInfoSchema,
  endpoints: z.array(
    z.object({
      method: z.enum(['GET', 'POST', 'DELETE']),
      path: z.string().min(1),
      summary: z.string().min(1)
    })
  ),
  healthExample: healthResponseSchema,
  watchlistsExample: watchlistsResponseSchema.optional(),
  profileExample: companyProfileSchema.optional()
});
export type ServiceDocsResponse = z.infer<typeof serviceDocsResponseSchema>;
