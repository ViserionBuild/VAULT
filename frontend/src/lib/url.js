// Parses what a person typed or pasted as a web address, adding https:// when
// the scheme is missing (the server stores it the same way). Null if invalid.
export function parseWebUrl(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed || /\s/.test(trimmed)) return null
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    // "notes" or "localhost" alone isn't something people mean to bookmark.
    if (!url.hostname.includes('.')) return null
    return url
  } catch {
    return null
  }
}

// Comparable form of a link, so http/https, "www." and a trailing slash don't
// make the same page look different.
export function canonicalUrl(text) {
  const url = parseWebUrl(text)
  if (!url) return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const path = url.pathname.replace(/\/+$/, '')
  return `${host}${path}${url.search}`
}
