/**
 * Generic hook that loads an asynchronous resource, exposes a uniform
 * {@link AsyncState}, refreshes it on a fixed interval, and transparently
 * caches the last successful payload in localStorage for instant first paint
 * and offline support.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AsyncState } from '../types/asyncState'
import { toUserMessage } from '../services/httpClient'
import { readCache, writeCache } from '../utils/storage'

/** Options for {@link useLiveData}. */
export interface LiveDataOptions {
  /** When set, the resource is hydrated from and persisted to localStorage. */
  readonly cacheKey?: string
}

/**
 * @typeParam T - The resource's value type.
 * @param fetcher - Async function that loads the resource; receives an abort signal.
 * @param intervalMs - Refresh cadence in milliseconds.
 * @param options - Optional caching configuration.
 * @returns The current {@link AsyncState} for the resource.
 */
export function useLiveData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  options: LiveDataOptions = {},
): AsyncState<T> {
  const { cacheKey } = options

  // Hydrate synchronously from cache so the UI never starts empty.
  const cached = cacheKey !== undefined ? readCache<T>(cacheKey) : null
  const [data, setData] = useState<T | null>(cached?.data ?? null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(cached?.cachedAt ?? null)

  // Keep the latest fetcher without forcing the polling effect to restart.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(
    async (signal: AbortSignal) => {
      setIsLoading(true)
      try {
        const result = await fetcherRef.current(signal)
        if (signal.aborted) return
        const now = Date.now()
        setData(result)
        setLastUpdated(now)
        setError(null)
        if (cacheKey !== undefined) writeCache(cacheKey, result, now)
      } catch (caught) {
        if (signal.aborted) return
        setError(toUserMessage(caught))
      } finally {
        if (!signal.aborted) setIsLoading(false)
      }
    },
    [cacheKey],
  )

  const [refreshToken, setRefreshToken] = useState(0)
  const refresh = useCallback(() => setRefreshToken((token) => token + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)

    const timer = setInterval(() => {
      void load(controller.signal)
    }, intervalMs)

    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [load, intervalMs, refreshToken])

  return { data, isLoading, error, lastUpdated, refresh }
}
