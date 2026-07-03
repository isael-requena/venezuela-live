/**
 * Vercel Serverless Function: GET /api/news
 *
 * Query params:
 *  - scope=general → fast national bucket (first paint)
 *  - refresh=1     → bypass the in-process cache (manual refresh)
 *
 * Returns aggregated, state-tagged Venezuelan news as JSON, cached at the edge.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { aggregateGeneral, aggregateNews, lastAggregatedAt } from './_lib/aggregate'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const general = url.searchParams.get('scope') === 'general'
    const force = url.searchParams.get('refresh') === '1'

    const items = general ? await aggregateGeneral() : await aggregateNews(Date.now(), force)

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
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ items: [], error: error instanceof Error ? error.message : 'failed' }))
  }
}
