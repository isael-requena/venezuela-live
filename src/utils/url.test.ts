import { describe, expect, it } from 'vitest'
import { hostnameOf, isHttpUrl } from './url'

describe('isHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isHttpUrl('https://a.com')).toBe(true)
    expect(isHttpUrl('http://a.com')).toBe(true)
  })

  it('rejects relative or non-http URLs', () => {
    expect(isHttpUrl('/path')).toBe(false)
    expect(isHttpUrl('ftp://a.com')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
  })
})

describe('hostnameOf', () => {
  it('returns the hostname without www', () => {
    expect(hostnameOf('https://www.elpitazo.net/articulo')).toBe('elpitazo.net')
  })

  it('returns empty string for invalid URLs', () => {
    expect(hostnameOf('not a url')).toBe('')
  })
})
