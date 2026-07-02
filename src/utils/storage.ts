/**
 * Tiny, type-safe wrapper around localStorage used to cache the last successful
 * payload of each live resource so the app can render instantly and work
 * offline. All access is guarded — storage may be unavailable or full.
 */

const NAMESPACE = 'vzla-live:'

/** A cached resource together with the time it was stored. */
export interface CachedEntry<T> {
  readonly data: T
  readonly cachedAt: number
}

/**
 * Read a cached entry.
 *
 * @param key - Logical cache key (namespaced internally).
 * @returns The cached entry, or null when absent/unreadable.
 */
export function readCache<T>(key: string): CachedEntry<T> | null {
  try {
    const raw = localStorage.getItem(NAMESPACE + key)
    if (raw === null) return null
    return JSON.parse(raw) as CachedEntry<T>
  } catch {
    return null
  }
}

/**
 * Persist a value for a key, stamping the current time.
 *
 * @param key - Logical cache key.
 * @param data - Value to store (must be JSON-serializable).
 * @param now - Current epoch ms.
 */
export function writeCache<T>(key: string, data: T, now: number): void {
  try {
    const entry: CachedEntry<T> = { data, cachedAt: now }
    localStorage.setItem(NAMESPACE + key, JSON.stringify(entry))
  } catch {
    // Ignore quota/serialization errors — caching is best-effort.
  }
}
