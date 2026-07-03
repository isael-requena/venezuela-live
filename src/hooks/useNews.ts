/**
 * Aggregated news with progressive loading:
 *  1. hydrate instantly from the localStorage cache (repeat visits),
 *  2. on a cold start, paint the quick "general" bucket first (~1s),
 *  3. then load the full state-tagged list and cache it.
 * There is no polling: refreshing is manual (the backend caps upstream fetches
 * to once per 8 min, so a tap is cheap).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchNews } from '../services/newsService'
import { toUserMessage } from '../services/httpClient'
import type { AsyncState } from '../types/asyncState'
import type { NewsItem } from '../types/domain'
import { readCache, writeCache } from '../utils/storage'

const CACHE_KEY = 'news'

/** @returns Async state holding the latest aggregated news. */
export function useNews(): AsyncState<NewsItem[]> {
  const cached = readCache<NewsItem[]>(CACHE_KEY)
  const [data, setData] = useState<NewsItem[] | null>(cached?.data ?? null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(cached?.cachedAt ?? null)
  const [refreshToken, setRefreshToken] = useState(0)

  const hasDataRef = useRef<boolean>((cached?.data?.length ?? 0) > 0)
  const forceRef = useRef<boolean>(false)
  const refresh = useCallback(() => {
    forceRef.current = true
    setRefreshToken((token) => token + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const loadFull = async (): Promise<void> => {
      setIsLoading(true)
      const force = forceRef.current
      forceRef.current = false
      try {
        const full = await fetchNews(signal, 'full', force)
        if (signal.aborted || full.length === 0) return
        setData(full)
        setLastUpdated(Date.now())
        setError(null)
        hasDataRef.current = true
        writeCache(CACHE_KEY, full, Date.now())
      } catch (caught) {
        if (!signal.aborted) setError(toUserMessage(caught))
      } finally {
        if (!signal.aborted) setIsLoading(false)
      }
    }

    const run = async (): Promise<void> => {
      // Quick first paint only when there is nothing on screen yet.
      if (!hasDataRef.current) {
        try {
          const quick = await fetchNews(signal, 'general')
          if (!signal.aborted && quick.length > 0 && !hasDataRef.current) {
            setData(quick)
            setLastUpdated(Date.now())
          }
        } catch {
          // The quick phase is best-effort; the full load reports real errors.
        }
      }
      await loadFull()
    }

    void run()
    return () => {
      controller.abort()
    }
  }, [refreshToken])

  return { data, isLoading, error, lastUpdated, refresh }
}
