/**
 * Domain models used across the UI.
 *
 * These are intentionally decoupled from the shape of any external API: each
 * service maps a validated raw response into one of these stable types, so the
 * components never depend on a third-party contract.
 */

import type { LatLngTuple } from 'leaflet'

/** A single seismic event normalized from the USGS feed. */
export interface Earthquake {
  readonly id: string
  readonly magnitude: number
  readonly place: string
  readonly coordinates: LatLngTuple
  /** Depth in kilometers. */
  readonly depthKm: number
  /** Event time as an epoch milliseconds value. */
  readonly time: number
  /** Canonical USGS detail URL. */
  readonly url: string
}

/** Kind of exchange rate quoted. */
export type DolarKind = 'oficial' | 'paralelo'

/** A single exchange rate (Bs. per USD). */
export interface DolarRate {
  readonly kind: DolarKind
  /** Display name of the source (e.g. "BCV", "Paralelo"). */
  readonly source: string
  /** Bolívares per US dollar. */
  readonly price: number
  /** Last update reported by the source, ISO 8601. */
  readonly updatedAt: string
}

/** Origin category of a news item, used by the "Oficiales / Redes" tabs. */
export type NewsCategory = 'oficial' | 'social'

/** Underlying platform a news item came from (drives the icon shown). */
export type NewsPlatform = 'rss' | 'telegram' | 'reddit' | 'youtube'

/** A news article normalized from an RSS feed or a social source. */
export interface NewsItem {
  readonly id: string
  readonly title: string
  readonly link: string
  /** Plain-text excerpt (HTML stripped). */
  readonly summary: string
  /** Publication date as epoch milliseconds, or null if unknown. */
  readonly publishedAt: number | null
  /** Outlet / channel name. */
  readonly sourceName: string
  /** Inferred region id, or null when no region could be matched. */
  readonly regionId: string | null
  /** Article image URL, or null when none was found. */
  readonly imageUrl: string | null
  /** Whether it comes from an official outlet or a social/scraped source. */
  readonly category: NewsCategory
  /** Source platform, for display. */
  readonly platform: NewsPlatform
}
