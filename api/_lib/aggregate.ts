/**
 * Server-side news aggregator (runs in the Vercel Function / Vite dev middleware).
 *
 * Fetching from a server (not the browser) removes CORS/proxy limitations, which
 * unlocks:
 *  - Google News RSS per Venezuelan state → real, recent, state-tagged news.
 *  - Outlet RSS with a real User-Agent (no 403s).
 *  - Reddit via RSS.
 *
 * Instagram/Facebook are intentionally excluded: their public content cannot be
 * scraped reliably or legally even from a server (auth-walled, anti-bot).
 */

import { parseFeed, type RawFeedItem } from './rss'
import { VENEZUELA_REGIONS } from '../../src/config/regions'
import { NEWS_SOURCES } from '../../src/config/newsSources'
import { mapLimit } from '../../src/utils/concurrency'
import { inferRegionId } from '../../src/utils/regionMatcher'
import { stripHtml, truncate } from '../../src/utils/text'
import type { NewsItem } from '../../src/types/domain'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const SUMMARY_MAX = 260
const PER_STATE = 5
const GENERAL_MAX = 18
const CONCURRENCY = 8
const CACHE_TTL_MS = 5 * 60 * 1000

/** Simple module-level cache so repeated calls within the TTL are instant. */
let cache: { at: number; items: NewsItem[] } | null = null

/** Fetch a URL as text with a browser-like UA. Returns null on any failure. */
async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

/** Build a Google News RSS search URL for a query. */
function googleNewsUrl(query: string): string {
  const params = new URLSearchParams({ q: query, hl: 'es-419', gl: 'VE', ceid: 'VE:es' })
  return `https://news.google.com/rss/search?${params.toString()}`
}

/** Parse an RSS date to epoch ms, or null. */
function parseDate(value: string | null): number | null {
  if (value === null) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

/** Google News titles end with " - Outlet"; split headline and outlet. */
function splitGoogleTitle(title: string, source: string | null): { title: string; outlet: string } {
  const dash = title.lastIndexOf(' - ')
  if (source !== null && source.length > 0) {
    return { title: dash > 0 ? title.slice(0, dash) : title, outlet: source }
  }
  if (dash > 0) return { title: title.slice(0, dash), outlet: title.slice(dash + 3) }
  return { title, outlet: 'Google News' }
}

/** Map a raw Google News item to a NewsItem for a given region (or general). */
function toGoogleNewsItem(raw: RawFeedItem, regionId: string | null, index: number): NewsItem | null {
  if (raw.title.length === 0 || !/^https?:/i.test(raw.link)) return null
  const { title, outlet } = splitGoogleTitle(stripHtml(raw.title), raw.source)
  return {
    id: `gn-${regionId ?? 'gen'}-${index}-${raw.link}`,
    title,
    link: raw.link,
    summary: truncate(stripHtml(raw.description), SUMMARY_MAX),
    publishedAt: parseDate(raw.pubDate),
    sourceName: outlet,
    regionId,
    imageUrl: raw.imageUrl,
    category: 'oficial',
    platform: 'rss',
  }
}

/** Fetch the broad, most-recent national news bucket (region = null). */
async function fetchGeneral(): Promise<NewsItem[]> {
  const xml = await fetchText(googleNewsUrl('Venezuela noticias when:1d'))
  if (xml === null) return []
  return parseFeed(xml)
    .slice(0, GENERAL_MAX)
    .map((raw, index) => toGoogleNewsItem(raw, null, index))
    .filter((item): item is NewsItem => item !== null)
}

/** Fetch state-tagged news for every region via Google News (state name only). */
async function fetchPerState(): Promise<NewsItem[]> {
  const perRegion = await mapLimit(VENEZUELA_REGIONS, CONCURRENCY, async (region) => {
    const xml = await fetchText(googleNewsUrl(`"${region.name}" Venezuela when:4d`))
    if (xml === null) return []
    return parseFeed(xml)
      .slice(0, PER_STATE)
      .map((raw, index) => toGoogleNewsItem(raw, region.id, index))
      .filter((item): item is NewsItem => item !== null)
  })
  return perRegion.flat()
}

/** Notable cities/islands queried explicitly and tagged to their state, so
 * places like Punto Fijo or Isla de Margarita get their own coverage. */
const CITY_QUERIES: ReadonlyArray<{ query: string; regionId: string }> = [
  { query: 'Punto Fijo', regionId: 'falcon' },
  { query: 'Isla de Margarita', regionId: 'nueva-esparta' },
  { query: 'Porlamar', regionId: 'nueva-esparta' },
  { query: 'Maracaibo', regionId: 'zulia' },
  { query: 'Barquisimeto', regionId: 'lara' },
  { query: 'Ciudad Guayana', regionId: 'bolivar' },
  { query: 'Puerto Ordaz', regionId: 'bolivar' },
  { query: 'Maracay', regionId: 'aragua' },
  { query: 'San Cristóbal Táchira', regionId: 'tachira' },
  { query: 'Cumaná', regionId: 'sucre' },
  { query: 'Maturín Monagas', regionId: 'monagas' },
  { query: 'Los Teques', regionId: 'miranda' },
]

/** Fetch city-level news for the curated {@link CITY_QUERIES}. */
async function fetchCities(): Promise<NewsItem[]> {
  const perCity = await mapLimit(CITY_QUERIES, CONCURRENCY, async (city) => {
    const xml = await fetchText(googleNewsUrl(`"${city.query}" Venezuela when:4d`))
    if (xml === null) return []
    return parseFeed(xml)
      .slice(0, 4)
      .map((raw, index) => toGoogleNewsItem(raw, city.regionId, index))
      .filter((item): item is NewsItem => item !== null)
  })
  return perCity.flat()
}

/** Fetch outlet RSS feeds (they carry images Google News lacks). */
async function fetchOutlets(): Promise<NewsItem[]> {
  const perSource = await mapLimit(NEWS_SOURCES, CONCURRENCY, async (source) => {
    const xml = await fetchText(source.feedUrl)
    if (xml === null) return []
    return parseFeed(xml)
      .slice(0, 10)
      .filter((raw) => raw.title.length > 0 && /^https?:/i.test(raw.link))
      .map((raw, index): NewsItem => {
        const title = stripHtml(raw.title)
        const summary = truncate(stripHtml(raw.description), SUMMARY_MAX)
        return {
          id: `rss-${source.id}-${index}-${raw.link}`,
          title,
          link: raw.link,
          summary,
          publishedAt: parseDate(raw.pubDate),
          sourceName: source.name,
          regionId: inferRegionId(`${title} ${summary}`),
          imageUrl: raw.imageUrl,
          category: 'oficial',
          platform: 'rss',
        }
      })
  })
  return perSource.flat()
}

/** Fetch a couple of Venezuela subreddits via RSS (social bucket). */
async function fetchReddit(): Promise<NewsItem[]> {
  const subs = [
    { id: 'rd-vzla', name: 'r/vzla', sub: 'vzla' },
    { id: 'rd-venezuela', name: 'r/Venezuela', sub: 'Venezuela' },
  ]
  const perSub = await mapLimit(subs, 2, async (s) => {
    const xml = await fetchText(`https://www.reddit.com/r/${s.sub}/new/.rss?limit=10`)
    if (xml === null) return []
    return parseFeed(xml)
      .filter((raw) => raw.title.length > 0 && /^https?:/i.test(raw.link))
      .map((raw, index): NewsItem => {
        const title = stripHtml(raw.title)
        const summary = truncate(stripHtml(raw.description), SUMMARY_MAX)
        return {
          id: `${s.id}-${index}-${raw.link}`,
          title,
          link: raw.link,
          summary,
          publishedAt: parseDate(raw.pubDate),
          sourceName: s.name,
          regionId: inferRegionId(`${title} ${summary}`),
          imageUrl: raw.imageUrl,
          category: 'social',
          platform: 'reddit',
        }
      })
  })
  return perSub.flat()
}

/** Normalize a title for de-duplication. */
function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9áéíóúñü ]/gi, '').replace(/\s+/g, ' ').trim()
}

/**
 * Aggregate all news, tagged by state where possible, newest first.
 * Results are cached in-process for {@link CACHE_TTL_MS}.
 *
 * @param now - Current epoch ms (injectable for testing).
 * @returns The merged news list.
 */
export async function aggregateNews(now: number = Date.now()): Promise<NewsItem[]> {
  if (cache !== null && now - cache.at < CACHE_TTL_MS) return cache.items

  const [general, perState, cities, outlets, reddit] = await Promise.all([
    fetchGeneral(),
    fetchPerState(),
    fetchCities(),
    fetchOutlets(),
    fetchReddit(),
  ])

  // General (national) news is authoritative for its titles; per-state queries
  // then contribute only genuinely state-specific stories.
  const seen = new Set<string>()
  const merged: NewsItem[] = []
  const add = (items: NewsItem[]): void => {
    for (const item of items) {
      const key = titleKey(item.title)
      if (key.length === 0 || seen.has(key)) continue
      seen.add(key)
      merged.push(item)
    }
  }
  add(general)
  add(perState)
  add(cities)
  add(outlets)
  add(reddit)

  const sorted = merged.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
  cache = { at: now, items: sorted }
  return sorted
}

/**
 * Fast subset for first paint: just the broad national bucket (one request),
 * so the UI shows recent news in ~1s while the full aggregation loads.
 *
 * @returns The general/national news list.
 */
export async function aggregateGeneral(): Promise<NewsItem[]> {
  return fetchGeneral()
}
