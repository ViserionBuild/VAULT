/**
 * URL metadata fetcher.
 * Fetches Open Graph tags, favicon, title, and description from a URL.
 * Uses native fetch (Node 18+) and simple HTML regex parsing to avoid
 * heavy dependencies like cheerio/puppeteer in dev/local mode.
 */

const TIMEOUT_MS = 8000
const USER_AGENT = 'Mozilla/5.0 (compatible; VaultBot/1.0; +https://vault.app)'

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

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    })

    clearTimeout(timer)

    if (!response.ok) return result

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return result

    const html = await response.text()

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

module.exports = { fetchUrlMetadata }
