/**
 * Vercel Serverless Function: GET /api/news
 *
 * Query params:
 *  - scope=general → fast national bucket (first paint)
 *  - refresh=1     → bypass the in-process cache (manual refresh)
 *
 * Returns aggregated, state-tagged Venezuelan news as JSON, cached at the edge.
 * The aggregator is imported dynamically inside the try so a module-load failure
 * surfaces as a readable JSON error instead of an opaque FUNCTION_INVOCATION_FAILED.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

/** Never let a slow upstream hang the function past the platform limit. */
const HANDLER_BUDGET_MS = 25_000

/** Reject after `ms` so the handler can always send a response in time. */
function timeout<T>(ms: number): Promise<T> {
  return new Promise<T>((_, reject) => {
    const timer = setTimeout(() => reject(new Error('aggregation-timeout')), ms)
    if (typeof timer.unref === 'function') timer.unref()
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const general = url.searchParams.get('scope') === 'general'
  const force = url.searchParams.get('refresh') === '1'

  try {
    const { aggregateGeneral, aggregateNews, lastAggregatedAt } = await import('./_lib/aggregate.js')

    const work = general ? aggregateGeneral() : aggregateNews(Date.now())
    const items = await Promise.race([work, timeout<Awaited<typeof work>>(HANDLER_BUDGET_MS)])

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader(
      'Cache-Control',
      force
        ? 'no-store'
        : general
          ? 'public, s-maxage=120, stale-while-revalidate=300'
          : 'public, s-maxage=480, stale-while-revalidate=900',
    )
    res.end(JSON.stringify({ items, generatedAt: lastAggregatedAt() ?? Date.now() }))
  } catch (error) {
    // Respond 200 with an empty list so the client renders cleanly instead of
    // falling into the slow client-side fallback; include the reason for debugging.
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(
      JSON.stringify({
        items: [],
        generatedAt: Date.now(),
        error: error instanceof Error ? error.message : 'failed',
      }),
    )
  }
}
