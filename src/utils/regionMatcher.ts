/**
 * Best-effort, client-side region inference for free text (news headlines).
 */

import { VENEZUELA_REGIONS, type Region } from '../config/regions'
import { normalize } from './text'

/** Pre-normalized alias index, computed once at module load. */
const ALIAS_INDEX: ReadonlyArray<{ readonly region: Region; readonly alias: string }> =
  VENEZUELA_REGIONS.flatMap((region) =>
    region.aliases.map((alias) => ({ region, alias: normalize(alias) })),
  )

/**
 * Infer the most likely Venezuelan region mentioned in a text.
 *
 * Matching is accent-insensitive and word-boundary aware to avoid false
 * positives (e.g. "lara" inside "declarar"). Longer aliases win when several
 * match, since they are more specific.
 *
 * @param text - Free text to scan (title + summary).
 * @returns The matched region id, or null when nothing matches.
 */
export function inferRegionId(text: string): string | null {
  const haystack = normalize(text)
  let best: { id: string; length: number } | null = null

  for (const { region, alias } of ALIAS_INDEX) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`)
    if (pattern.test(haystack) && (best === null || alias.length > best.length)) {
      best = { id: region.id, length: alias.length }
    }
  }

  return best?.id ?? null
}

/** Escape RegExp metacharacters in a literal string. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
