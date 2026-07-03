/**
 * Self-contained helpers for the serverless function. Deliberately NOT imported
 * from `src/` — Vercel functions must not depend on files outside `api/`, and
 * `src/` pulls in browser-only types. Keep this in sync with the client utils.
 */

/** A news item as consumed by the frontend. */
export interface NewsItem {
  id: string
  title: string
  link: string
  summary: string
  publishedAt: number | null
  sourceName: string
  regionId: string | null
  imageUrl: string | null
  category: 'oficial' | 'social'
  platform: 'rss' | 'telegram' | 'reddit' | 'youtube'
}

/** A Venezuelan region with matching aliases and centroid. */
export interface Region {
  readonly id: string
  readonly name: string
  readonly aliases: readonly string[]
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
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

/** Decode numeric and common named HTML entities. */
export function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
}

/** Strip HTML tags, decode entities and collapse whitespace. */
export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Truncate with an ellipsis. */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max).trimEnd()}…`
}

/** Lowercase + strip accents for accent-insensitive matching. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Run tasks with bounded concurrency, preserving input order. */
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

/** Escape RegExp metacharacters. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
