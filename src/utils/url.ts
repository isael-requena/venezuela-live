/** URL helpers shared across services and UI. */

/**
 * Whether a string is an absolute http(s) URL.
 *
 * @param value - Candidate string.
 * @returns True for well-formed http/https URLs.
 */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

/**
 * Extract the hostname of a URL for display (e.g. "elpitazo.net").
 *
 * @param value - A URL string.
 * @returns The hostname without `www.`, or an empty string when invalid.
 */
export function hostnameOf(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
