/**
 * RSS feeds of Venezuelan independent news outlets.
 *
 * Feeds are fetched client-side through a public CORS proxy (see
 * {@link services/newsService}). Each source is kept small and curated; add or
 * remove outlets here without touching the fetching logic.
 */

export interface NewsSource {
  /** Stable identifier. */
  readonly id: string
  /** Human-readable outlet name. */
  readonly name: string
  /** Public RSS/Atom feed URL. */
  readonly feedUrl: string
}

export const NEWS_SOURCES: readonly NewsSource[] = [
  { id: 'efecto-cocuyo', name: 'Efecto Cocuyo', feedUrl: 'https://efectococuyo.com/feed/' },
  { id: 'runrunes', name: 'Runrun.es', feedUrl: 'https://runrun.es/feed/' },
  { id: 'el-pitazo', name: 'El Pitazo', feedUrl: 'https://elpitazo.net/feed/' },
  { id: 'tal-cual', name: 'TalCual', feedUrl: 'https://talcualdigital.com/feed/' },
  { id: 'cronica-uno', name: 'Crónica Uno', feedUrl: 'https://cronica.uno/feed/' },
] as const
