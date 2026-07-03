/**
 * Server-side news aggregator (Vercel Function + Vite dev middleware).
 *
 * Self-contained (no imports from `src/`) so it bundles reliably on Vercel.
 * Fetching from a server removes CORS/proxy limits, unlocking:
 *  - Google News RSS per state + topical queries (recent official coverage),
 *  - outlet RSS with a real User-Agent (no 403s),
 *  - Reddit via RSS, and YouTube via Data API v3 (when YOUTUBE_API_KEY is set).
 *
 * Results are cached in-process; the edge cache (s-maxage) dedupes across users.
 */

import { parseFeed } from './rss.js'
import { REGIONS, inferRegionId } from './regions.js'
import { fetchTelegram } from './telegram.js'
import { mapLimit, stripHtml, truncate, type NewsItem } from './util.js'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const SUMMARY_MAX = 260
const PER_STATE = 5
const GENERAL_MAX = 20
const CONCURRENCY = 8
const CACHE_TTL_MS = 8 * 60 * 1000

/** Official outlet RSS feeds (server-side fetch, no CORS). */
const OUTLETS: ReadonlyArray<{ id: string; name: string; url: string }> = [
  { id: 'efecto-cocuyo', name: 'Efecto Cocuyo', url: 'https://efectococuyo.com/feed/' },
  { id: 'runrunes', name: 'Runrun.es', url: 'https://runrun.es/feed/' },
  { id: 'el-pitazo', name: 'El Pitazo', url: 'https://elpitazo.net/feed/' },
  { id: 'tal-cual', name: 'TalCual', url: 'https://talcualdigital.com/feed/' },
  { id: 'cronica-uno', name: 'Crónica Uno', url: 'https://cronica.uno/feed/' },
  { id: 'el-nacional', name: 'El Nacional', url: 'https://www.elnacional.com/feed/' },
  { id: 'la-patilla', name: 'La Patilla', url: 'https://www.lapatilla.com/feed/' },
  { id: 'diario-2001', name: 'Diario 2001', url: 'https://www.2001.com.ve/feed/' },
  { id: 'el-impulso', name: 'El Impulso', url: 'https://www.elimpulso.com/feed/' },
  { id: 'analitica', name: 'Analítica', url: 'https://www.analitica.com/feed/' },
  { id: 'contrapunto', name: 'Contrapunto', url: 'https://contrapunto.com/feed/' },
  { id: 'version-final', name: 'Versión Final', url: 'https://versionfinal.com.ve/feed/' },
  { id: 'descifrado', name: 'Descifrado', url: 'https://www.descifrado.com/feed/' },
  { id: 'el-cooperante', name: 'El Cooperante', url: 'https://elcooperante.com/feed/' },
  { id: 'ultimas-noticias', name: 'Últimas Noticias', url: 'https://ultimasnoticias.com.ve/feed/' },
]

/** Topical Google News queries for broad, recent coverage (incl. the crisis). */
const TOPIC_QUERIES: readonly string[] = [
  'Venezuela noticias when:1d',
  'Venezuela política when:2d',
  'Venezuela economía when:2d',
  'Venezuela sucesos when:1d',
  'terremoto OR sismo Venezuela when:2d',
  'emergencia OR damnificados Venezuela when:2d',
  'ayuda humanitaria Venezuela when:3d',
  'servicios OR gasolina OR electricidad Venezuela when:2d',
]

/** Notable cities/islands queried explicitly and tagged to their state. */
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

let cache: { at: number; items: NewsItem[] } | null = null

/** Per-request timeout so one slow upstream cannot hang the whole function. */
const FETCH_TIMEOUT_MS = 7000

/** Fetch a URL as text with a browser-like UA. Null on any failure/timeout. */
async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

function googleNewsUrl(query: string): string {
  const params = new URLSearchParams({ q: query, hl: 'es-419', gl: 'VE', ceid: 'VE:es' })
  return `https://news.google.com/rss/search?${params.toString()}`
}

function parseDate(value: string | null): number | null {
  if (value === null) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

function splitGoogleTitle(title: string, source: string | null): { title: string; outlet: string } {
  const dash = title.lastIndexOf(' - ')
  if (source !== null && source.length > 0) {
    return { title: dash > 0 ? title.slice(0, dash) : title, outlet: source }
  }
  if (dash > 0) return { title: title.slice(0, dash), outlet: title.slice(dash + 3) }
  return { title, outlet: 'Google News' }
}

/** Fetch one Google News query, mapping results to a region (or general). */
async function fetchGoogleQuery(query: string, regionId: string | null, limit: number, tag: string): Promise<NewsItem[]> {
  const xml = await fetchText(googleNewsUrl(query))
  if (xml === null) return []
  return parseFeed(xml)
    .slice(0, limit)
    .filter((raw) => raw.title.length > 0 && /^https?:/i.test(raw.link))
    .map((raw, index): NewsItem => {
      const { title, outlet } = splitGoogleTitle(stripHtml(raw.title), raw.source)
      return {
        id: `gn-${tag}-${index}-${raw.link}`,
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
    })
}

async function fetchGeneral(): Promise<NewsItem[]> {
  return fetchGoogleQuery('Venezuela noticias when:1d', null, GENERAL_MAX, 'gen')
}

async function fetchTopics(): Promise<NewsItem[]> {
  const perTopic = await mapLimit(TOPIC_QUERIES, CONCURRENCY, (q, i) =>
    fetchGoogleQuery(q, null, 12, `t${i}`),
  )
  return perTopic.flat()
}

async function fetchPerState(): Promise<NewsItem[]> {
  const perRegion = await mapLimit(REGIONS, CONCURRENCY, (region) =>
    fetchGoogleQuery(`"${region.name}" Venezuela when:4d`, region.id, PER_STATE, region.id),
  )
  return perRegion.flat()
}

async function fetchCities(): Promise<NewsItem[]> {
  const perCity = await mapLimit(CITY_QUERIES, CONCURRENCY, (city) =>
    fetchGoogleQuery(`"${city.query}" Venezuela when:4d`, city.regionId, 4, `c-${city.regionId}`),
  )
  return perCity.flat()
}

async function fetchOutlets(): Promise<NewsItem[]> {
  const perSource = await mapLimit(OUTLETS, CONCURRENCY, async (source) => {
    const xml = await fetchText(source.url)
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

async function fetchReddit(): Promise<NewsItem[]> {
  const subs = [
    { id: 'rd-vzla', name: 'r/vzla', sub: 'vzla' },
    { id: 'rd-venezuela', name: 'r/Venezuela', sub: 'Venezuela' },
  ]
  // Concurrency 1: Reddit rate-limits (429) two near-simultaneous requests from
  // the same IP, which would silently empty the "Redes" tab.
  const perSub = await mapLimit(subs, 1, async (s) => {
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

/** YouTube via Data API v3 — only when YOUTUBE_API_KEY is configured. */
async function fetchYoutube(): Promise<NewsItem[]> {
  const key = process.env.YOUTUBE_API_KEY
  if (key === undefined || key.length === 0) return []
  const params = new URLSearchParams({
    part: 'snippet',
    q: 'Venezuela noticias',
    type: 'video',
    order: 'date',
    regionCode: 'VE',
    relevanceLanguage: 'es',
    maxResults: '12',
    key,
  })
  const raw = await fetchText(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`)
  if (raw === null) return []
  try {
    const json = JSON.parse(raw) as {
      items?: Array<{
        id?: { videoId?: string }
        snippet?: {
          title?: string
          description?: string
          publishedAt?: string
          channelTitle?: string
          thumbnails?: { high?: { url?: string }; medium?: { url?: string } }
        }
      }>
    }
    return (json.items ?? [])
      .filter((v) => typeof v.id?.videoId === 'string' && typeof v.snippet?.title === 'string')
      .map((v, index): NewsItem => {
        const s = v.snippet ?? {}
        const title = stripHtml(s.title ?? '')
        const summary = truncate(stripHtml(s.description ?? ''), SUMMARY_MAX)
        return {
          id: `yt-${index}-${v.id?.videoId ?? ''}`,
          title,
          link: `https://www.youtube.com/watch?v=${v.id?.videoId ?? ''}`,
          summary,
          publishedAt: s.publishedAt !== undefined ? parseDate(s.publishedAt) : null,
          sourceName: `${s.channelTitle ?? 'YouTube'} · YouTube`,
          regionId: inferRegionId(`${title} ${summary}`),
          imageUrl: s.thumbnails?.high?.url ?? s.thumbnails?.medium?.url ?? null,
          category: 'social',
          platform: 'youtube',
        }
      })
  } catch {
    return []
  }
}

function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9áéíóúñü ]/gi, '').replace(/\s+/g, ' ').trim()
}

/**
 * Aggregate all news (state-tagged where possible), newest first, cached.
 *
 * Upstream sources are hit at most once per {@link CACHE_TTL_MS} (8 min): the
 * in-process cache always wins inside that window, even for a manual refresh, so
 * neither the user's nor the server's IP can hammer the sources.
 *
 * @param now - Current epoch ms.
 * @returns The merged news list.
 */
export async function aggregateNews(now: number = Date.now()): Promise<NewsItem[]> {
  if (cache !== null && now - cache.at < CACHE_TTL_MS) return cache.items

  const [general, topics, perState, cities, outlets, reddit, telegram, youtube] = await Promise.all([
    fetchGeneral(),
    fetchTopics(),
    fetchPerState(),
    fetchCities(),
    fetchOutlets(),
    fetchReddit(),
    fetchTelegram(now),
    fetchYoutube(),
  ])

  const byKey = new Map<string, NewsItem>()
  const merged: NewsItem[] = []
  const add = (items: NewsItem[]): void => {
    for (const item of items) {
      const key = titleKey(item.title)
      if (key.length === 0) continue
      const existing = byKey.get(key)
      if (existing !== undefined) {
        // Same story from another source: enrich the one we kept.
        if (existing.imageUrl === null && item.imageUrl !== null) existing.imageUrl = item.imageUrl
        // Prefer a direct outlet link over a Google News redirect (real domain →
        // opens directly and can be framed when the outlet allows it).
        if (existing.link.includes('news.google.com') && !item.link.includes('news.google.com')) {
          existing.link = item.link
          existing.sourceName = item.sourceName
          if (item.imageUrl !== null) existing.imageUrl = item.imageUrl
        }
        continue
      }
      byKey.set(key, item)
      merged.push(item)
    }
  }
  add(general)
  add(topics)
  add(perState)
  add(cities)
  add(outlets)
  add(reddit)
  add(telegram)
  add(youtube)

  const sorted = merged.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
  cache = { at: now, items: sorted }
  return sorted
}

/** Fast subset for first paint: the broad national bucket only (~1s). */
export async function aggregateGeneral(): Promise<NewsItem[]> {
  return fetchGeneral()
}

/** Epoch ms of the last full aggregation, or null if none yet. */
export function lastAggregatedAt(): number | null {
  return cache?.at ?? null
}
