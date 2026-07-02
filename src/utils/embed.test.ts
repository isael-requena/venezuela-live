import { describe, expect, it } from 'vitest'
import { embedTarget } from './embed'
import type { NewsItem } from '../types/domain'

function makeItem(partial: Partial<NewsItem>): NewsItem {
  return {
    id: 'x',
    title: 't',
    link: '',
    summary: '',
    publishedAt: null,
    sourceName: 's',
    regionId: null,
    imageUrl: null,
    category: 'social',
    platform: 'rss',
    ...partial,
  }
}

describe('embedTarget', () => {
  it('builds a YouTube embed URL from a watch link', () => {
    const target = embedTarget(
      makeItem({ platform: 'youtube', link: 'https://www.youtube.com/watch?v=ABC123' }),
    )
    expect(target).toEqual({ url: 'https://www.youtube.com/embed/ABC123', embeddable: true })
  })

  it('builds a Telegram embed URL from a post link', () => {
    const target = embedTarget(
      makeItem({ platform: 'telegram', link: 'https://t.me/elpitazo/57831' }),
    )
    expect(target.embeddable).toBe(true)
    expect(target.url).toBe('https://t.me/elpitazo/57831?embed=1&dark=1')
  })

  it('falls back to the raw link for generic sources', () => {
    const target = embedTarget(makeItem({ platform: 'rss', link: 'https://news.com/a' }))
    expect(target).toEqual({ url: 'https://news.com/a', embeddable: false })
  })
})
