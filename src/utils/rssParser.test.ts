// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseRssFeed } from './rssParser'

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <item>
      <title>Primera noticia</title>
      <link>https://medio.com/articulo-1</link>
      <guid>https://medio.com/?p=1</guid>
      <pubDate>Mon, 29 Jun 2026 10:00:00 GMT</pubDate>
      <description><![CDATA[<img src="https://medio.com/foto.jpg"/> Resumen uno]]></description>
    </item>
    <item>
      <title>Segunda noticia</title>
      <link>https://medio.com/articulo-2</link>
      <media:content url="https://medio.com/media.jpg" medium="image"/>
      <description>Resumen dos</description>
    </item>
  </channel>
</rss>`

describe('parseRssFeed', () => {
  it('parses items with title, link and date', () => {
    const items = parseRssFeed(RSS)
    expect(items).toHaveLength(2)
    expect(items[0]?.title).toBe('Primera noticia')
    expect(items[0]?.link).toBe('https://medio.com/articulo-1')
    expect(items[0]?.pubDate).toContain('2026')
  })

  it('extracts an inline image from the description', () => {
    const items = parseRssFeed(RSS)
    expect(items[0]?.imageUrl).toBe('https://medio.com/foto.jpg')
  })

  it('extracts a media:content image', () => {
    const items = parseRssFeed(RSS)
    expect(items[1]?.imageUrl).toBe('https://medio.com/media.jpg')
  })

  it('returns an empty array for invalid XML', () => {
    expect(parseRssFeed('not xml <<<')).toEqual([])
  })
})
