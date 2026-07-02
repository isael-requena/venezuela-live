/**
 * Minimal RSS/Atom parser built on the browser's DOMParser.
 *
 * Extracts the fields the app needs (title, link, description, date, image) and
 * is tolerant of both RSS 2.0 (`<item>`) and Atom (`<entry>`) feeds, including
 * the common namespaced media extensions used to attach images.
 */

import { isHttpUrl } from './url'

/** A single raw feed entry, before domain mapping. */
export interface ParsedFeedItem {
  readonly title: string
  readonly link: string
  readonly description: string
  readonly pubDate: string | null
  /** Best-effort article image URL, or null when none was found. */
  readonly imageUrl: string | null
}

/** Read the trimmed text content of the first matching child tag. */
function readTag(parent: Element, tag: string): string {
  const node = parent.getElementsByTagName(tag)[0]
  return node?.textContent?.trim() ?? ''
}

/**
 * Resolve the canonical article link.
 *
 * Robust against feeds that include several `<link>`/`<atom:link>` elements
 * (e.g. WordPress comment feeds). We prefer an `alternate`/unspecified-rel link
 * whose target is an absolute URL, then fall back to `<guid>` when it is a URL.
 */
function readLink(item: Element): string {
  const links = Array.from(item.getElementsByTagName('link'))

  for (const link of links) {
    const rel = link.getAttribute('rel')
    if (rel !== null && rel !== 'alternate') continue
    const href = link.getAttribute('href')?.trim() ?? ''
    if (isHttpUrl(href)) return href
    const text = link.textContent?.trim() ?? ''
    if (isHttpUrl(text)) return text
  }

  const guid = readTag(item, 'guid')
  return isHttpUrl(guid) ? guid : ''
}

/** Try the namespaced media extensions for an image URL. */
function readMediaImage(item: Element): string | null {
  const mediaTags = ['media:content', 'media:thumbnail', 'enclosure']
  for (const tag of mediaTags) {
    for (const node of Array.from(item.getElementsByTagName(tag))) {
      const type = node.getAttribute('type') ?? ''
      const medium = node.getAttribute('medium') ?? ''
      const url = node.getAttribute('url')?.trim() ?? ''
      const looksImage = tag !== 'enclosure' || type.startsWith('image') || medium === 'image'
      if (isHttpUrl(url) && looksImage) return url
    }
  }
  return null
}

/** Fall back to the first `<img>` found inside the description/content HTML. */
function readInlineImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  const url = match?.[1]?.trim()
  return url !== undefined && isHttpUrl(url) ? url : null
}

/**
 * Parse an RSS/Atom XML document into a list of entries.
 *
 * @param xml - Raw feed XML.
 * @returns The parsed entries (empty when the document is invalid).
 */
export function parseRssFeed(xml: string): ParsedFeedItem[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) return []

  const rssItems = Array.from(doc.getElementsByTagName('item'))
  const entries = rssItems.length > 0 ? rssItems : Array.from(doc.getElementsByTagName('entry'))

  return entries.map((item) => {
    const rawContent =
      item.getElementsByTagName('content:encoded')[0]?.textContent ??
      readTag(item, 'description') ??
      ''
    const description = readTag(item, 'description') || readTag(item, 'summary') || rawContent

    return {
      title: readTag(item, 'title'),
      link: readLink(item),
      description,
      pubDate: readTag(item, 'pubDate') || readTag(item, 'updated') || readTag(item, 'published') || null,
      imageUrl: readMediaImage(item) ?? readInlineImage(rawContent) ?? readInlineImage(description),
    }
  })
}
