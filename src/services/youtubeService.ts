/**
 * YouTube channel reader.
 *
 * Reads the official per-channel Atom feed
 * (`youtube.com/feeds/videos.xml?channel_id=…`) through the CORS proxy chain.
 * This is a public, sanctioned feed — no scraping, no blocking.
 */

import type { YoutubeSource } from '../config/socialSources'
import type { NewsItem } from '../types/domain'
import { inferRegionId } from '../utils/regionMatcher'
import { parseRssFeed } from '../utils/rssParser'
import { logError } from '../utils/logger'
import { stripHtml, truncate } from '../utils/text'
import { fetchViaProxy } from './corsProxy'

const MAX_ITEMS = 8
const SUMMARY_MAX = 220

/**
 * Fetch and normalize the latest videos of a YouTube channel.
 *
 * @param source - YouTube source config.
 * @param signal - Optional abort signal.
 * @returns Normalized news items (newest first); empty on any failure.
 */
export async function fetchYoutube(source: YoutubeSource, signal?: AbortSignal): Promise<NewsItem[]> {
  try {
    const xml = await fetchViaProxy(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${source.channelId}`,
      signal,
      (body) => body.includes('<entry'),
    )
    const entries = parseRssFeed(xml).slice(0, MAX_ITEMS)

    return entries
      .filter((entry) => entry.title.length > 0 && entry.link.length > 0)
      .map((entry, index): NewsItem => {
        const title = stripHtml(entry.title)
        const summary = truncate(stripHtml(entry.description), SUMMARY_MAX)
        const ms = entry.pubDate !== null ? Date.parse(entry.pubDate) : Number.NaN
        return {
          id: `${source.id}-${index}-${entry.link}`,
          title,
          link: entry.link,
          summary,
          publishedAt: Number.isNaN(ms) ? null : ms,
          sourceName: `${source.name} · YouTube`,
          regionId: inferRegionId(`${title} ${summary}`),
          imageUrl: entry.imageUrl,
          category: 'social',
          platform: 'youtube',
        }
      })
  } catch (error) {
    logError(`youtube:${source.channelId}`, error)
    return []
  }
}
