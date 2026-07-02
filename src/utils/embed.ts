/**
 * Resolve an embeddable URL for the in-app reader iframe.
 *
 * Most sites block being framed (X-Frame-Options / CSP), but several platforms
 * expose dedicated embed endpoints that DO work inside an iframe:
 *  - YouTube  → `youtube.com/embed/<id>`
 *  - Telegram → `t.me/<channel>/<id>?embed=1`
 * For everything else we attempt the raw link and let the UI show a fallback.
 */

import type { NewsItem } from '../types/domain'

/** An iframe target plus whether it is known to allow framing. */
export interface EmbedTarget {
  readonly url: string
  /** True when the URL is a dedicated embed endpoint guaranteed to frame. */
  readonly embeddable: boolean
}

/** Extract a YouTube video id from a watch/share/shorts URL. */
function youtubeId(link: string): string | null {
  try {
    const url = new URL(link)
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.slice(1)
      return id.length > 0 ? id : null
    }
    if (url.pathname.startsWith('/shorts/')) {
      const parts = url.pathname.split('/')
      return parts[2] ?? null
    }
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

/** Build the Telegram single-post embed URL from a `t.me/<ch>/<id>` link. */
function telegramEmbed(link: string): string | null {
  const match = link.match(/t\.me\/([^/?#]+)\/(\d+)/)
  const channel = match?.[1]
  const postId = match?.[2]
  if (channel === undefined || postId === undefined) return null
  return `https://t.me/${channel}/${postId}?embed=1&dark=1`
}

/**
 * Compute the best iframe target for a news item.
 *
 * @param item - The news item.
 * @returns The URL to load and whether it is guaranteed to frame.
 */
export function embedTarget(item: NewsItem): EmbedTarget {
  if (item.platform === 'youtube') {
    const id = youtubeId(item.link)
    if (id !== null) return { url: `https://www.youtube.com/embed/${id}`, embeddable: true }
  }
  if (item.platform === 'telegram') {
    const embed = telegramEmbed(item.link)
    if (embed !== null) return { url: embed, embeddable: true }
  }
  return { url: item.link, embeddable: false }
}
