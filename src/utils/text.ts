/**
 * Small, pure text helpers shared across services.
 */

/** Common named HTML entities (Spanish content) → their character. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
}

/**
 * Decode numeric (`&#124;`, `&#x7c;`) and common named HTML entities.
 *
 * @param value - Text possibly containing HTML entities.
 * @returns The decoded text.
 */
export function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
}

/**
 * Remove HTML tags, decode entities and collapse whitespace.
 *
 * @param html - Raw HTML or text.
 * @returns Plain text with normalized spacing.
 */
export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Lowercase a string and strip diacritics so comparisons are accent-insensitive.
 *
 * @param value - Input text.
 * @returns Normalized, accent-free, lowercase text.
 */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Truncate text to a maximum length, appending an ellipsis when cut.
 *
 * @param value - Input text.
 * @param max - Maximum number of characters.
 * @returns The original or truncated string.
 */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max).trimEnd()}…`
}
