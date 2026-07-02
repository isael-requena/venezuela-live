/**
 * Social / scraped sources for the "Redes" news section.
 *
 * All three platforms below are fetchable from a pure frontend through a CORS
 * proxy WITHOUT triggering IP bans (public, lenient endpoints):
 *  - Telegram: the public channel preview at `t.me/s/<channel>` (HTML).
 *  - Reddit: the public `r/<sub>/new.json` endpoint (JSON).
 *  - YouTube: the official per-channel Atom feed (XML).
 *
 * Instagram/Facebook/X are intentionally excluded: they block unauthenticated
 * cross-origin reads and would require a backend with rotating credentials.
 */

/** A public Telegram channel (scraped via its web preview). */
export interface TelegramSource {
  readonly kind: 'telegram'
  readonly id: string
  readonly name: string
  /** Channel username without the leading "@". */
  readonly channel: string
}

/** A public subreddit (read via its JSON listing). */
export interface RedditSource {
  readonly kind: 'reddit'
  readonly id: string
  readonly name: string
  /** Subreddit name without the leading "r/". */
  readonly subreddit: string
}

/** A YouTube channel (read via its official Atom feed). */
export interface YoutubeSource {
  readonly kind: 'youtube'
  readonly id: string
  readonly name: string
  /** Channel id (starts with "UC..."). */
  readonly channelId: string
}

export type SocialSource = TelegramSource | RedditSource | YoutubeSource

// NOTE: only Telegram channels with the public web preview ENABLED can be
// scraped (others return a contact page). Verified-working channels only.
// NOTE: only Telegram channels with the public web preview ENABLED can be
// scraped (others return a contact page). All channels below verified working.
export const SOCIAL_SOURCES: readonly SocialSource[] = [
  { kind: 'telegram', id: 'tg-el-pitazo', name: 'El Pitazo', channel: 'elpitazo' },
  { kind: 'telegram', id: 'tg-vpitv', name: 'VPItv', channel: 'vpitv' },
  { kind: 'telegram', id: 'tg-reporte-ya', name: 'Reporte Ya', channel: 'ReporteYa' },
  { kind: 'telegram', id: 'tg-cronica-uno', name: 'Crónica Uno', channel: 'cronicauno' },
  { kind: 'telegram', id: 'tg-primer-informe', name: 'Primer Informe', channel: 'primerinforme' },
  { kind: 'reddit', id: 'rd-vzla', name: 'r/vzla', subreddit: 'vzla' },
  { kind: 'reddit', id: 'rd-venezuela', name: 'r/Venezuela', subreddit: 'Venezuela' },
  { kind: 'youtube', id: 'yt-vpitv', name: 'VPItv', channelId: 'UCVFiIRuxJ2GmJLUkHmlmj4w' },
] as const
