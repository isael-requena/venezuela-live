import { describe, expect, it } from 'vitest'
import { normalize, stripHtml, truncate } from './text'

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hola   <b>mundo</b></p>')).toBe('Hola mundo')
  })

  it('replaces HTML entities with spaces', () => {
    expect(stripHtml('a&nbsp;b')).toBe('a b')
  })
})

describe('normalize', () => {
  it('lowercases and strips accents', () => {
    expect(normalize('Mérida')).toBe('merida')
    expect(normalize('TÁCHIRA')).toBe('tachira')
  })
})

describe('truncate', () => {
  it('keeps short strings untouched', () => {
    expect(truncate('hola', 10)).toBe('hola')
  })

  it('truncates and appends an ellipsis', () => {
    expect(truncate('abcdefgh', 4)).toBe('abcd…')
  })
})
