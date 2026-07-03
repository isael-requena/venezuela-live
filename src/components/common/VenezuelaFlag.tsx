/**
 * Venezuelan tricolor flag with its arc of eight white stars.
 *
 * The stars are what distinguish it from the Colombian flag (same yellow/blue/red
 * bands but no stars), so they are always rendered — as small five-pointed stars
 * laid on the shallow upward arc used on the real flag.
 */

import type { ReactNode } from 'react'

/** Venezuela has carried eight stars on its flag since 2006. */
const STAR_COUNT = 8
/** Outer radius of each star, in viewBox units. */
const STAR_RADIUS = 1.7

/**
 * Points of a unit five-pointed star (outer r=1, inner r=0.382) pointing up,
 * reused for every star via a `translate`/`scale` transform.
 */
const UNIT_STAR = Array.from({ length: 10 }, (_, index) => {
  const radius = index % 2 === 0 ? 1 : 0.382
  const angle = (-90 + index * 36) * (Math.PI / 180)
  return `${(radius * Math.cos(angle)).toFixed(3)},${(radius * Math.sin(angle)).toFixed(3)}`
}).join(' ')

/**
 * Eight star centers across the blue band on a shallow arch (∩): the middle
 * stars sit higher than the ends, matching the real flag.
 */
const STAR_POSITIONS = Array.from({ length: STAR_COUNT }, (_, index) => {
  const t = index / (STAR_COUNT - 1)
  const offset = (t - 0.5) * 2
  return { x: 14 + t * 32, y: 18.8 + 2.2 * (offset * offset) }
})

interface VenezuelaFlagProps {
  /** Extra classes (sizing, rounding, shadow). Should include `overflow-hidden`. */
  readonly className?: string
}

/**
 * @param props - {@link VenezuelaFlagProps}.
 */
export function VenezuelaFlag({ className }: VenezuelaFlagProps): ReactNode {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden>
      <rect width="60" height="13.34" fill="#fcd34d" />
      <rect y="13.33" width="60" height="13.34" fill="#2563eb" />
      <rect y="26.66" width="60" height="13.34" fill="#dc2626" />
      <g fill="#fff">
        {STAR_POSITIONS.map((star, index) => (
          <polygon
            key={index}
            points={UNIT_STAR}
            transform={`translate(${star.x} ${star.y}) scale(${STAR_RADIUS})`}
          />
        ))}
      </g>
    </svg>
  )
}
