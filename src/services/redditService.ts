/**
 * Reddit subreddit reader.
 *
 * Reads the subreddit's public Atom feed (`/r/<sub>/new/.rss`) through the CORS
 * proxy chain. The RSS endpoint is far more proxy-friendly than `.json` (which
 * Reddit serves as HTML / 403s to datacenter IPs). Public, read-only, gentle.
 */

import type { RedditSource } from '../config/socialSources'
import type { NewsItem } from '../types/domain'
import { inferRegionId } from '../utils/regionMatcher'
import { parseRssFeed } from '../utils/rssParser'
import { logError } from '../utils/logger'
import { stripHtml, truncate } from '../utils/text'
import { fetchViaProxy } from './corsProxy'

const MAX_POSTS = 12
const SUMMARY_MAX = 240

/**
 * Fetch and normalize the latest posts of a subreddit.
 *
 * @param source - Reddit source config.
 * @param signal - Optional abort signal.
 * @returns Normalized news items (newest first); empty on any failure.
 */
export async function fetchReddit(source: RedditSource, signal?: AbortSignal): Promise<NewsItem[]> {
  try {
    const xml = await fetchViaProxy(
      `https://www.reddit.com/r/${source.subreddit}/new/.rss?limit=${MAX_POSTS}`,
      signal,
      (body) => /<entry|<item/i.test(body),
    )
    const entries = parseRssFeed(xml).slice(0, MAX_POSTS)

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
          sourceName: source.name,
          regionId: inferRegionId(`${title} ${summary}`),
          imageUrl: entry.imageUrl,
          category: 'social',
          platform: 'reddit',
        }
      })
  } catch (error) {
    logError(`reddit:${source.subreddit}`, error)
    return []
  }
}
