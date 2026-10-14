/**
 * URL metadata fetcher.
 * Fetches Open Graph tags, favicon, title, and description from a URL.
 * Uses native fetch (Node 18+) and simple HTML regex parsing to avoid
 * heavy dependencies like cheerio/puppeteer in dev/local mode.
 */

const dns = require('node:dns').promises
const net = require('node:net')

const TIMEOUT_MS = 8000
const USER_AGENT = 'Mozilla/5.0 (compatible; VaultBot/1.0; +https://vault.app)'
const MAX_REDIRECTS = 5
// Metadata lives in <head>; never download more than this.
const MAX_HTML_BYTES = 2 * 1024 * 1024

// The server fetches URLs that users type, so it must not be usable to reach
// its own network: loopback, private ranges, link-local (incl. the cloud
// metadata endpoint 169.254.169.254), CGNAT, multicast and reserved space.
const blockedRanges = new net.BlockList()
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) {
  blockedRanges.addSubnet(address, prefix, 'ipv4')
}
for (const [address, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]]) {
  blockedRanges.addSubnet(address, prefix, 'ipv6')
}

function isBlockedAddress(address) {
  // IPv4-mapped IPv6 (::ffff:10.0.0.1) must be judged as the IPv4 it wraps.
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped) return blockedRanges.check(mapped[1], 'ipv4')
  return blockedRanges.check(address, net.isIPv6(address) ? 'ipv6' : 'ipv4')
}

/**
 * Throws unless the URL is http(s) and every address its host resolves to is
 * public. (A DNS answer could still change between this check and the fetch;
 * this blocks the straightforward cases.)
 */
async function assertPublicUrl(rawUrl) {
  const url = new URL(rawUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs can be fetched')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = net.isIP(host)
    ? [host]
    : (await dns.lookup(host, { all: true, verbatim: true })).map((entry) => entry.address)
  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    throw new Error('URL resolves to a private or reserved address')
  }
  return url
}

// fetch with redirects followed by hand, so each hop is checked as well.
async function fetchPublic(rawUrl, init) {
  let current = rawUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicUrl(current)
    const response = await fetch(current, { ...init, redirect: 'manual' })
    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current).href
      continue
    }
    return { response, finalUrl: current }
  }
  throw new Error('Too many redirects')
}

async function readCapped(response, maxBytes) {
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (total < maxBytes) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  await reader.cancel().catch(() => {})
  return Buffer.concat(chunks).subarray(0, maxBytes).toString('utf8')
}

/**
 * Fetch and parse metadata from a URL.
 * @param {string} url
 * @returns {Promise<{title: string|null, description: string|null, favicon: string|null, ogImage: string|null, siteName: string|null}>}
 */
async function fetchUrlMetadata(url) {
  const result = {
    title: null,
    description: null,
    favicon: null,
    ogImage: null,
    siteName: null,
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const { response, finalUrl } = await fetchPublic(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    })
    // Relative links in the page resolve against where it actually came from.
    url = finalUrl

    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.includes('text/html')) {
      clearTimeout(timer)
      await response.body?.cancel().catch(() => {})
      return result
    }

    // The timeout covers the body too, so a slow-dripping server can't hang it.
    const html = await readCapped(response, MAX_HTML_BYTES)
    clearTimeout(timer)

    // <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (titleMatch) {
      result.title = decodeHtmlEntities(titleMatch[1].trim()).slice(0, 512)
    }

    // OG title
    result.title = extractMeta(html, 'og:title') ?? result.title

    // Description
    result.description =
      extractMeta(html, 'og:description') ?? extractMeta(html, 'description') ?? null

    if (result.description) {
      result.description = result.description.slice(0, 1024)
    }

    // OG image
    result.ogImage = extractMeta(html, 'og:image') ?? null
    if (result.ogImage && !result.ogImage.startsWith('http')) {
      result.ogImage = new URL(result.ogImage, url).href
    }

    // Site name
    result.siteName = extractMeta(html, 'og:site_name') ?? null

    // Favicon
    const faviconMatch = html.match(
      /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
    )
    if (faviconMatch) {
      result.favicon = faviconMatch[1].startsWith('http')
        ? faviconMatch[1]
        : new URL(faviconMatch[1], url).href
    } else {
      // Fallback: default favicon path
      try {
        const origin = new URL(url).origin
        result.favicon = `${origin}/favicon.ico`
      } catch {
        // ignore
      }
    }
  } catch {
    // Network timeout or parse error - return partial result
  }

  return result
}

function extractMeta(html, name) {
  // Match both property and name attributes
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escapeRegex(name)}["'][^>]*content=["']([^"']*?)["']`,
    'i',
  )
  const match = html.match(regex)
  if (match) return decodeHtmlEntities(match[1].trim())

  // Reverse order: content before property
  const regex2 = new RegExp(
    `<meta[^>]*content=["']([^"']*?)["'][^>]*(?:property|name)=["']${escapeRegex(name)}["']`,
    'i',
  )
  const match2 = html.match(regex2)
  if (match2) return decodeHtmlEntities(match2[1].trim())

  return null
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

module.exports = { fetchUrlMetadata, assertPublicUrl, isBlockedAddress }
