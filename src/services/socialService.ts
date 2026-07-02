/**
 * Aggregates all social/scraped sources (Telegram, Reddit, YouTube) into a flat
 * list of news fetchers, each producing normalized {@link NewsItem}s tagged as
 * `category: 'social'`.
 */

import { SOCIAL_SOURCES, type SocialSource } from '../config/socialSources'
import type { NewsItem } from '../types/domain'
import { fetchReddit } from './redditService'
import { fetchTelegram } from './telegramService'
import { fetchYoutube } from './youtubeService'

/** Dispatch a social source to its platform-specific fetcher. */
function fetchSocialSource(source: SocialSource, signal?: AbortSignal): Promise<NewsItem[]> {
  switch (source.kind) {
    case 'telegram':
      return fetchTelegram(source, signal)
    case 'reddit':
      return fetchReddit(source, signal)
    case 'youtube':
      return fetchYoutube(source, signal)
  }
}

/**
 * Build one thunk per configured social source.
 *
 * @param signal - Optional abort signal applied to every fetch.
 * @returns Thunks suitable for a concurrency-limited runner.
 */
export function socialFetchers(signal?: AbortSignal): ReadonlyArray<() => Promise<NewsItem[]>> {
  return SOCIAL_SOURCES.map((source) => () => fetchSocialSource(source, signal))
}
