/**
 * Run async tasks with a bounded concurrency.
 *
 * Used so the app fetches many feeds without firing all requests at once —
 * gentler on the public CORS proxies and far less likely to trip rate limits
 * or IP bans.
 */

/**
 * Execute `task` for each item, keeping at most `limit` running concurrently.
 *
 * @typeParam T - Item type.
 * @typeParam R - Result type.
 * @param items - Items to process.
 * @param limit - Maximum number of concurrent tasks (clamped to >= 1).
 * @param task - Async worker invoked per item.
 * @returns Results in the same order as `items`.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length)
  const max = Math.max(1, Math.min(limit, items.length))
  let cursor = 0

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      const item = items[index]
      if (item === undefined) return
      results[index] = await task(item, index)
    }
  }

  await Promise.all(Array.from({ length: max }, () => worker()))
  return results
}
