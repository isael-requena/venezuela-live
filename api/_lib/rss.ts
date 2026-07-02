/**
 * Server-side RSS/Atom parser (Node runtime) built on fast-xml-parser.
 *
 * Files under `api/_lib` are shared helpers, not endpoints (the leading
 * underscore keeps Vercel from exposing them as routes).
 */

import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
})

/** A raw feed entry before normalization. */
export interface RawFeedItem {
  readonly title: string
  readonly link: string
  readonly pubDate: string | null
  readonly description: string
  readonly imageUrl: string | null
  /** Outlet name when the feed exposes one (e.g. Google News `<source>`). */
  readonly source: string | null
}

/** Coerce a fast-xml-parser value (string | { '#text' } | array) to text. */
function text(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return text(value[0])
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return text(record['#text'])
  }
  return ''
}

/** Read an attribute from a value that may be an object with attributes. */
function attr(value: unknown, name: string): string {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const raw = record[`@_${name}`]
    return typeof raw === 'string' ? raw : ''
  }
  return ''
}

/** Resolve the canonical article link for RSS or Atom. */
function resolveLink(node: Record<string, unknown>): string {
  const link = node['link']
  if (typeof link === 'string') return link
  if (Array.isArray(link)) {
    for (const candidate of link) {
      const href = attr(candidate, 'href')
      if (/^https?:/i.test(href)) return href
    }
    return text(link)
  }
  const href = attr(link, 'href')
  if (/^https?:/i.test(href)) return href
  return text(link)
}

/** Best-effort image extraction (media tags or first inline <img>). */
function resolveImage(node: Record<string, unknown>, description: string): string | null {
  const media = attr(node['media:content'], 'url') || attr(node['media:thumbnail'], 'url')
  if (/^https?:/i.test(media)) return media
  const enclosure = attr(node['enclosure'], 'url')
  if (/^https?:/i.test(enclosure)) return enclosure
  const match = description.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1] && /^https?:/i.test(match[1]) ? match[1] : null
}

/**
 * Parse an RSS 2.0 or Atom feed into raw entries.
 *
 * @param xml - Feed body.
 * @returns Parsed entries (empty on malformed input).
 */
export function parseFeed(xml: string): RawFeedItem[] {
  let doc: Record<string, unknown>
  try {
    doc = parser.parse(xml) as Record<string, unknown>
  } catch {
    return []
  }

  const rss = doc['rss'] as Record<string, unknown> | undefined
  const channel = rss?.['channel'] as Record<string, unknown> | undefined
  const feed = doc['feed'] as Record<string, unknown> | undefined

  const rawNodes = channel?.['item'] ?? feed?.['entry'] ?? []
  const nodes = Array.isArray(rawNodes) ? rawNodes : [rawNodes]

  return nodes
    .filter((node): node is Record<string, unknown> => node !== null && typeof node === 'object')
    .map((node) => {
      const description = text(node['description']) || text(node['summary']) || text(node['content'])
      return {
        title: text(node['title']),
        link: resolveLink(node),
        pubDate:
          text(node['pubDate']) || text(node['published']) || text(node['updated']) || null,
        description,
        imageUrl: resolveImage(node, description),
        source: text(node['source']) || null,
      }
    })
}
