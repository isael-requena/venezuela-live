/**
 * Central configuration for the application.
 *
 * Everything that is environment- or domain-specific (geographic bounds,
 * refresh cadence, external endpoints) lives here so the rest of the codebase
 * never hardcodes magic values.
 */

import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet'

/** Geographic center of mainland Venezuela, used as the initial map view. */
export const VENEZUELA_CENTER: LatLngTuple = [7.5, -66.0]

/** Default zoom level that frames the whole country. */
export const DEFAULT_ZOOM = 6

/**
 * Bounding box that contains continental Venezuela (plus a margin for offshore
 * seismic activity). Order: [minLat, minLon] / [maxLat, maxLon].
 */
export const VENEZUELA_BBOX = {
  minLatitude: 0.5,
  maxLatitude: 13.5,
  minLongitude: -74.5,
  maxLongitude: -59.0,
} as const

/** Leaflet bounds derived from {@link VENEZUELA_BBOX}. */
export const VENEZUELA_BOUNDS: LatLngBoundsExpression = [
  [VENEZUELA_BBOX.minLatitude, VENEZUELA_BBOX.minLongitude],
  [VENEZUELA_BBOX.maxLatitude, VENEZUELA_BBOX.maxLongitude],
]

/**
 * Looser pan limits for the map itself (with margin around the country) so
 * popovers near the edges can be auto-panned fully into view. Kept wider than
 * {@link VENEZUELA_BBOX}, which stays tight for the earthquake query.
 */
export const MAP_MAX_BOUNDS: LatLngBoundsExpression = [
  [VENEZUELA_BBOX.minLatitude - 4, VENEZUELA_BBOX.minLongitude - 3],
  [VENEZUELA_BBOX.maxLatitude + 4, VENEZUELA_BBOX.maxLongitude + 3],
]

/** How often each live data source is refreshed, in milliseconds. */
export const REFRESH_INTERVALS = {
  earthquakes: 60 * 1000,
  dolar: 3 * 60 * 1000,
  news: 5 * 60 * 1000,
} as const

/** Generic timeout applied to every outbound request. */
export const REQUEST_TIMEOUT_MS = 12_000
