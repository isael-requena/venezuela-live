/**
 * Presentation helpers for formatting domain values in Spanish.
 */

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const bsFormatter = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateTimeFormatter = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Format an epoch timestamp as a human relative time (e.g. "hace 5 min").
 *
 * @param epochMs - Timestamp in milliseconds, or null.
 * @returns A localized relative string, or "—" when null.
 */
export function formatRelativeTime(epochMs: number | null): string {
  if (epochMs === null) return '—'
  const diffSeconds = Math.round((epochMs - Date.now()) / 1000)
  const absSeconds = Math.abs(diffSeconds)

  if (absSeconds < 60) return relativeFormatter.format(Math.round(diffSeconds), 'second')
  if (absSeconds < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), 'minute')
  if (absSeconds < 86_400) return relativeFormatter.format(Math.round(diffSeconds / 3600), 'hour')
  return relativeFormatter.format(Math.round(diffSeconds / 86_400), 'day')
}

/**
 * Format an absolute date-time in Venezuelan locale.
 *
 * @param epochMs - Timestamp in milliseconds.
 * @returns A localized date-time string.
 */
export function formatDateTime(epochMs: number): string {
  return dateTimeFormatter.format(epochMs)
}

/**
 * Format a bolívares-per-USD price.
 *
 * @param price - Numeric price.
 * @returns A localized currency string (e.g. "Bs. 36,50").
 */
export function formatBs(price: number): string {
  return `Bs. ${bsFormatter.format(price)}`
}

/**
 * Pick a hex color for an earthquake magnitude (green → red scale).
 *
 * @param magnitude - Richter magnitude.
 * @returns A hex color string.
 */
export function magnitudeColor(magnitude: number): string {
  if (magnitude >= 6) return '#7f1d1d'
  if (magnitude >= 5) return '#dc2626'
  if (magnitude >= 4) return '#f97316'
  if (magnitude >= 3) return '#facc15'
  return '#84cc16'
}

/**
 * Map a magnitude to a marker radius in pixels.
 *
 * @param magnitude - Richter magnitude.
 * @returns A radius suitable for a Leaflet CircleMarker.
 */
export function magnitudeRadius(magnitude: number): number {
  return Math.max(4, magnitude * 3.2)
}
