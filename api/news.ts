/**
 * Vercel Serverless Function: GET /api/news
 *
 * Returns aggregated, state-tagged Venezuelan news as JSON. Cached at the edge
 * (s-maxage) so the upstream feeds are hit at most once every few minutes.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { aggregateNews } from './_lib/aggregate'

export default async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const items = await aggregateNews()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.end(JSON.stringify({ items, generatedAt: Date.now() }))
  } catch {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ items: [], error: 'aggregation_failed' }))
  }
}
