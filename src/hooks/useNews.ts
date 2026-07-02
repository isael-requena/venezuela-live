/** Live aggregated news from Venezuelan outlets, refreshed periodically. */

import { REFRESH_INTERVALS } from '../config/constants'
import { fetchNews } from '../services/newsService'
import type { AsyncState } from '../types/asyncState'
import type { NewsItem } from '../types/domain'
import { useLiveData } from './useLiveData'

/** @returns Async state holding the latest aggregated news. */
export function useNews(): AsyncState<NewsItem[]> {
  return useLiveData<NewsItem[]>((signal) => fetchNews(signal), REFRESH_INTERVALS.news, {
    cacheKey: 'news',
  })
}
