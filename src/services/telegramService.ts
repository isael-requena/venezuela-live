/**
 * Telegram channel scraper.
 *
 * Reads the public web preview at `https://t.me/s/<channel>` through the CORS
 * proxy chain and parses the message widgets out of the returned HTML. This is
 * public, unauthenticated content and is fetched gently (cached + rate-limited
 * upstream), so it does not get the user's IP blocked.
 */

import type { TelegramSource } from '../config/socialSources'
import type { NewsItem } from '../types/domain'
import { inferRegionId } from '../utils/regionMatcher'
import { logError } from '../utils/logger'
import { stripHtml, truncate } from '../utils/text'
import { isHttpUrl } from '../utils/url'
import { fetchViaProxy } from './corsProxy'

const MAX_MESSAGES = 10
const TITLE_MAX = 110
const SUMMARY_MAX = 260

/** Extract the background-image URL from an inline style attribute. */
function imageFromStyle(style: string | null): string | null {
  if (style === null) return null
  const match = style.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/i)
  const url = match?.[1]?.trim()
  return url !== undefined && isHttpUrl(url) ? url : null
}

/**
 * Fetch and normalize the latest posts of a Telegram channel.
 *
 * @param source - Telegram source config.
 * @param signal - Optional abort signal.
 * @returns Normalized news items (newest first); empty on any failure.
 */
export async function fetchTelegram(source: TelegramSource, signal?: AbortSignal): Promise<NewsItem[]> {
  try {
    const html = await fetchViaProxy(`https://t.me/s/${source.channel}`, signal, (body) =>
      body.includes('tgme_widget_message'),
    )
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const messages = Array.from(doc.querySelectorAll('.tgme_widget_message'))

    // The preview lists oldest→newest; take the tail and reverse to newest-first.
    const recent = messages.slice(-MAX_MESSAGES).reverse()

    return recent
      .map((message, index): NewsItem | null => {
        const text = stripHtml(message.querySelector('.tgme_widget_message_text')?.innerHTML ?? '')
        const dateAnchor = message.querySelector<HTMLAnchorElement>('a.tgme_widget_message_date')
        const link = dateAnchor?.getAttribute('href') ?? ''
        const datetime = message.querySelector('time')?.getAttribute('datetime') ?? null
        const photo = message.querySelector('.tgme_widget_message_photo_wrap')
        const video = message.querySelector('.tgme_widget_message_video_thumb')
        const imageUrl =
          imageFromStyle(photo?.getAttribute('style') ?? null) ??
          imageFromStyle(video?.getAttribute('style') ?? null)

        if (text.length === 0 || !isHttpUrl(link)) return null

        const ms = datetime !== null ? Date.parse(datetime) : Number.NaN
        const title = truncate(text, TITLE_MAX)
        const summary = truncate(text, SUMMARY_MAX)

        return {
          id: `${source.id}-${index}-${link}`,
          title,
          link,
          summary,
          publishedAt: Number.isNaN(ms) ? null : ms,
          sourceName: `${source.name} · Telegram`,
          regionId: inferRegionId(summary),
          imageUrl,
          category: 'social',
          platform: 'telegram',
        }
      })
      .filter((item): item is NewsItem => item !== null)
  } catch (error) {
    logError(`telegram:${source.channel}`, error)
    return []
  }
}
