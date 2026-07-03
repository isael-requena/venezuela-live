/**
 * Telegram public-channel scraper.
 *
 * Telegram exposes a read-only HTML preview at `https://t.me/s/<channel>` with
 * no API key and no rate limit worth worrying about (we fetch it server-side and
 * cache the result). We parse the stable `tgme_widget_message` widget markup to
 * extract the newest posts: text, date, image and the canonical post link.
 */

import { stripHtml, truncate, type NewsItem } from './util.js'
import { inferRegionId } from './regions.js'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const SUMMARY_MAX = 260
const TITLE_MAX = 140
/** Newest posts to keep per channel (the preview lists oldest→newest). */
const PER_CHANNEL = 6
/** Drop posts older than this (crisis feed must stay fresh). */
const MAX_AGE_MS = 12 * 24 * 60 * 60 * 1000

/** Public Venezuelan news channels verified to expose a `/s/` preview. */
export const TELEGRAM_CHANNELS: ReadonlyArray<{ channel: string; name: string }> = [
  { channel: 'ElPitazo', name: 'El Pitazo' },
  { channel: 'VPITV', name: 'VPItv' },
  { channel: 'ReporteYa', name: 'Reporte Ya' },
  { channel: 'NoticiasVenezuela', name: 'Noticias Venezuela' },
  { channel: 'elimpulso', name: 'El Impulso' },
  { channel: 'descifrado', name: 'Descifrado' },
]

/** One parsed Telegram post before it becomes a {@link NewsItem}. */
interface TelegramPost {
  readonly id: string
  readonly text: string
  readonly link: string
  readonly imageUrl: string | null
  readonly publishedAt: number | null
}

/** Extract the first regex capture group, or null. */
function firstMatch(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern)
  return match?.[1] ?? null
}

/**
 * Parse a `t.me/s/<channel>` HTML page into posts (oldest→newest as returned).
 *
 * @param html - The raw preview HTML.
 * @returns The parsed posts in document order.
 */
export function parseTelegramHtml(html: string): TelegramPost[] {
  // Each message segment begins at a `data-post="channel/id"` marker and runs
  // until the next one (a message contains exactly one such marker).
  const segments = html.split('data-post="').slice(1)
  const posts: TelegramPost[] = []
  for (const segment of segments) {
    const id = firstMatch(segment, /^([^"]+)"/)
    if (id === null) continue

    const rawText = firstMatch(segment, /tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/)
    const text = rawText !== null ? stripHtml(rawText.replace(/<br\s*\/?>/gi, ' ')).trim() : ''
    // Skip link-only or empty posts (nothing meaningful to show as a headline).
    if (text.length < 15) continue

    const iso = firstMatch(segment, /<time[^>]+datetime="([^"]+)"/)
    const ms = iso !== null ? Date.parse(iso) : Number.NaN

    // Message photo (exclude inline emoji images served from telegram.org).
    const image = firstMatch(
      segment,
      /tgme_widget_message_photo_wrap[^"]*"[^>]*background-image:url\('([^']+)'\)/,
    )

    posts.push({
      id,
      text,
      link: `https://t.me/${id}`,
      imageUrl: image,
      publishedAt: Number.isNaN(ms) ? null : ms,
    })
  }
  return posts
}

/** Fetch one channel's preview page as text. Null on any failure. */
async function fetchChannel(channel: string): Promise<string | null> {
  try {
    const response = await fetch(`https://t.me/s/${channel}`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(7000),
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

/**
 * Fetch the newest posts from all configured Telegram channels.
 *
 * @param now - Current epoch ms, used to drop stale posts.
 * @returns Social {@link NewsItem}s newest-first per channel.
 */
export async function fetchTelegram(now: number): Promise<NewsItem[]> {
  const perChannel = await Promise.all(
    TELEGRAM_CHANNELS.map(async ({ channel, name }) => {
      const html = await fetchChannel(channel)
      if (html === null) return []
      return parseTelegramHtml(html)
        .filter((post) => post.publishedAt === null || now - post.publishedAt < MAX_AGE_MS)
        .slice(-PER_CHANNEL)
        .reverse()
        .map((post, index): NewsItem => {
          const summary = truncate(post.text, SUMMARY_MAX)
          return {
            id: `tg-${post.id}-${index}`,
            title: truncate(post.text, TITLE_MAX),
            link: post.link,
            summary,
            publishedAt: post.publishedAt,
            sourceName: `${name} · Telegram`,
            regionId: inferRegionId(post.text),
            imageUrl: post.imageUrl,
            category: 'social',
            platform: 'telegram',
          }
        })
    }),
  )
  return perChannel.flat()
}
