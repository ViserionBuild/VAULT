import { describe, it, expect } from 'vitest'
import { canonicalUrl, parseWebUrl } from '../lib/url'
import { hostOf } from '../hooks/use-open-item'

describe('parseWebUrl', () => {
  it('adds https:// when the scheme is missing', () => {
    expect(parseWebUrl('github.com/vault')?.href).toBe('https://github.com/vault')
  })

  it('rejects text that is not a web address', () => {
    expect(parseWebUrl('just some words')).toBeNull()
    expect(parseWebUrl('notes')).toBeNull()
    expect(parseWebUrl('ftp://example.com')).toBeNull()
    expect(parseWebUrl('')).toBeNull()
  })
})

describe('canonicalUrl', () => {
  it('treats scheme, www. and a trailing slash as the same page', () => {
    const same = ['https://www.github.com/', 'http://github.com', 'github.com', 'GitHub.com/']
    expect(new Set(same.map(canonicalUrl))).toEqual(new Set(['github.com']))
  })

  it('keeps paths and queries distinct', () => {
    expect(canonicalUrl('example.com/a')).not.toBe(canonicalUrl('example.com/b'))
    expect(canonicalUrl('example.com/a?x=1')).not.toBe(canonicalUrl('example.com/a'))
  })
})

describe('hostOf', () => {
  it('shows the host without www and never throws', () => {
    expect(hostOf('https://www.react.dev/learn')).toBe('react.dev')
    expect(hostOf('tailwindcss.com')).toBe('tailwindcss.com')
    expect(hostOf('not a url at all')).toBe('not a url at all')
  })
})
