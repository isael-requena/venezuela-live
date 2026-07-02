import { describe, expect, it } from 'vitest'
import { inferRegionId } from './regionMatcher'

describe('inferRegionId', () => {
  it('matches a capital city to its region', () => {
    expect(inferRegionId('Fuerte aguacero en Maracaibo esta tarde')).toBe('zulia')
  })

  it('is accent-insensitive', () => {
    expect(inferRegionId('Noticias desde Merida')).toBe('merida')
  })

  it('returns null when no region is mentioned', () => {
    expect(inferRegionId('Economía mundial en alza')).toBeNull()
  })

  it('avoids false positives inside other words (word boundaries)', () => {
    // "lara" must not match inside "declarar"
    expect(inferRegionId('El presidente va a declarar mañana')).toBeNull()
  })

  it('prefers the longer, more specific alias', () => {
    expect(inferRegionId('Sucesos en Ciudad Guayana hoy')).toBe('bolivar')
  })
})
