/**
 * Generic representation of an asynchronous, periodically-refreshed resource.
 * Shared by every live-data hook so the UI handles loading/error/stale states
 * uniformly.
 */
export interface AsyncState<T> {
  /** Latest successfully loaded value, or null before the first success. */
  readonly data: T | null
  /** True while a request is in flight. */
  readonly isLoading: boolean
  /** Human-readable error message from the last failed attempt, or null. */
  readonly error: string | null
  /** Epoch ms of the last successful load, or null. */
  readonly lastUpdated: number | null
  /** Imperatively trigger a refresh. */
  readonly refresh: () => void
}
