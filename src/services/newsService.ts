/**
 * News aggregation service.
 *
 * Primary path: the serverless `/api/news` endpoint, which fetches Google News
 * per Venezuelan state (state-tagged, most recent) plus outlet RSS and Reddit
 * from a server — no CORS/proxy limits. Fallback path (e.g. static hosting with
 * no functions): the resilient client-side CORS-proxy aggregation of outlet RSS
 * and social sources.
 */

import { z } from 'zod'
import { NEWS_SOURCES, type NewsSource } from '../config/newsSources'
import type { NewsItem } from '../types/domain'
import { mapLimit } from '../utils/concurrency'
import { logError } from '../utils/logger'
import { inferRegionId } from '../utils/regionMatcher'
import { parseRssFeed } from '../utils/rssParser'
import { stripHtml, truncate } from '../utils/text'
import { fetchViaProxy } from './corsProxy'
import { socialFetchers } from './socialService'

const SUMMARY_MAX_LENGTH = 260
const MAX_ITEMS_PER_SOURCE = 12
/** Max simultaneous outbound fetches across all sources. */
const FETCH_CONCURRENCY = 4

/** Parse an RSS date string into epoch ms, or null when unparseable. */
function parseDate(value: string | null): number | null {
  if (value === null) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

/**
 * Fetch and normalize one official RSS outlet. Failures yield an empty list so
 * one broken feed never breaks the aggregation.
 */
async function fetchRssSource(source: NewsSource, signal?: AbortSignal): Promise<NewsItem[]> {
  try {
    const xml = await fetchViaProxy(source.feedUrl, signal, (body) => /<item|<entry/i.test(body))
    const entries = parseRssFeed(xml).slice(0, MAX_ITEMS_PER_SOURCE)

    return entries
      .filter((entry) => entry.title.length > 0 && entry.link.length > 0)
      .map((entry, index): NewsItem => {
        const summary = truncate(stripHtml(entry.description), SUMMARY_MAX_LENGTH)
        const title = stripHtml(entry.title)
        return {
          id: `${source.id}-${index}-${entry.link}`,
          title,
          link: entry.link,
          summary,
          publishedAt: parseDate(entry.pubDate),
          sourceName: source.name,
          regionId: inferRegionId(`${title} ${summary}`),
          imageUrl: entry.imageUrl,
          category: 'oficial',
          platform: 'rss',
        }
      })
  } catch (error) {
    logError(`rss:${source.id}`, error)
    return []
  }
}

/** Schema for the `/api/news` response (validates the backend contract). */
const newsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  link: z.string(),
  summary: z.string(),
  publishedAt: z.number().nullable(),
  sourceName: z.string(),
  regionId: z.string().nullable(),
  imageUrl: z.string().nullable(),
  category: z.enum(['oficial', 'social']),
  platform: z.enum(['rss', 'telegram', 'reddit', 'youtube']),
})
const apiResponseSchema = z.object({ items: z.array(newsItemSchema) })

/**
 * Fetch the latest news via the client-side proxy aggregation (fallback path).
 *
 * @param signal - Optional abort signal.
 * @returns A flat, de-duplicated, date-sorted (newest first) list of articles.
 */
async function fetchNewsClient(signal?: AbortSignal): Promise<NewsItem[]> {
  const officialFetchers = NEWS_SOURCES.map((source) => () => fetchRssSource(source, signal))
  const fetchers = [...officialFetchers, ...socialFetchers(signal)]

  const perSource = await mapLimit(fetchers, FETCH_CONCURRENCY, (run) => run())

  const seen = new Set<string>()
  const merged: NewsItem[] = []
  for (const item of perSource.flat()) {
    if (seen.has(item.link)) continue
    seen.add(item.link)
    merged.push(item)
  }

  return merged.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
}

/** Which slice of news to request from the API. */
export type NewsScope = 'general' | 'full'

/**
 * Fetch news from the serverless API. For `full`, falls back to the client-side
 * proxy aggregation when the API is unavailable (e.g. static hosting). The fast
 * `general` phase has no fallback (it's just for a quick first paint).
 *
 * @param signal - Optional abort signal.
 * @param scope - `general` (quick) or `full` (everything).
 * @returns A date-sorted (newest first) list of articles.
 */
export async function fetchNews(signal?: AbortSignal, scope: NewsScope = 'full'): Promise<NewsItem[]> {
  const url = scope === 'general' ? '/api/news?scope=general' : '/api/news'
  try {
    const response = await fetch(url, signal !== undefined ? { signal } : {})
    if (response.ok) {
      const parsed = apiResponseSchema.parse(await response.json())
      if (parsed.items.length > 0) return parsed.items
    }
  } catch (error) {
    logError('api:news', error)
  }
  return scope === 'general' ? [] : fetchNewsClient(signal)
}
