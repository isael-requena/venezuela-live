/**
 * Resilient CORS proxy layer for fetching cross-origin resources (RSS feeds)
 * that don't send CORS headers themselves.
 *
 * Several public proxies are tried in order until one returns a usable body, so
 * a single proxy outage never takes the feature down.
 */

import { fetchText, HttpError } from './httpClient'

/**
 * Ordered list of proxy URL builders. Each takes a target URL and returns the
 * proxied request URL. They are attempted top-to-bottom.
 */
const PROXIES: ReadonlyArray<(target: string) => string> = [
  (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
  (target) => `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
  (target) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}`,
  (target) => `https://thingproxy.freeboard.io/fetch/${target}`,
]

/** Heuristic: treat clearly-empty or error-page bodies as a failed attempt. */
function looksValid(body: string): boolean {
  return body.trim().length > 64
}

/**
 * Rotating start offset so consecutive calls don't always hammer the same first
 * proxy — spreads load across providers to avoid rate limits / IP bans.
 */
let rotation = 0

/**
 * Fetch a cross-origin resource as text, trying each configured proxy in turn,
 * starting from a rotating offset.
 *
 * @param targetUrl - The original resource URL.
 * @param signal - Optional abort signal (aborts the whole chain).
 * @param validate - Optional content check; a proxy whose body fails it is
 *   skipped and the next proxy is tried. Use this to reject blocked/stripped
 *   responses (e.g. a Reddit 403 page or a Telegram preview without messages).
 * @returns The first usable response body.
 * @throws {HttpError} When every proxy fails.
 */
export async function fetchViaProxy(
  targetUrl: string,
  signal?: AbortSignal,
  validate?: (body: string) => boolean,
): Promise<string> {
  let lastError: unknown = null
  const start = rotation
  rotation = (rotation + 1) % PROXIES.length

  for (let offset = 0; offset < PROXIES.length; offset += 1) {
    if (signal?.aborted) throw new HttpError('Aborted', 0)
    const buildUrl = PROXIES[(start + offset) % PROXIES.length]
    if (buildUrl === undefined) continue
    try {
      const body = await fetchText(buildUrl(targetUrl), signal)
      if (looksValid(body) && (validate === undefined || validate(body))) return body
    } catch (error) {
      lastError = error
    }
  }

  const reason = lastError instanceof Error ? lastError.message : 'all proxies failed'
  throw new HttpError(`No proxy could fetch the resource: ${reason}`, 0)
}
