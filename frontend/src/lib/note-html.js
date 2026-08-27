import DOMPurify from 'dompurify'

/**
 * Sanitizer for note content.
 *
 * The previous config stripped `span` and `style`, so any colour, highlight,
 * or size applied in the editor was silently discarded when the note was
 * viewed — formatting appeared to work, then vanished. These allowances are
 * what let a note render the way it was written.
 *
 * Safety still holds: no script/iframe/object tags, no event handlers, and
 * `style` is filtered to a safe property whitelist below.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'div', 'span',
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code', 'hr',
  'a', 'font',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img',
]

const ALLOWED_ATTR = ['href', 'rel', 'target', 'class', 'style', 'src', 'alt', 'colspan', 'rowspan', 'color']

// Only presentational properties; nothing that can position or load resources.
const SAFE_STYLE_PROPS = new Set([
  'color', 'background-color', 'font-size', 'font-family', 'font-weight',
  'font-style', 'text-align', 'text-decoration', 'line-height',
  'padding-left', 'margin-left',
])

let hookInstalled = false

function installHooks() {
  if (hookInstalled) return
  hookInstalled = true

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Strip any style property outside the whitelist, and reject url(...)
    // values outright so nothing can fetch a remote resource.
    const style = node.getAttribute?.('style')
    if (style) {
      const kept = style
        .split(';')
        .map((rule) => rule.trim())
        .filter(Boolean)
        .filter((rule) => {
          const [prop, ...rest] = rule.split(':')
          const value = rest.join(':')
          if (!prop || !value) return false
          if (/url\s*\(/i.test(value) || /expression\s*\(/i.test(value)) return false
          return SAFE_STYLE_PROPS.has(prop.trim().toLowerCase())
        })
      if (kept.length) node.setAttribute('style', kept.join('; '))
      else node.removeAttribute('style')
    }

    // Inline images only as data URIs or https; never javascript:.
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') ?? ''
      if (!/^data:image\//i.test(src) && !/^https:\/\//i.test(src)) {
        node.remove()
        return
      }
    }

    // External links open safely.
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('rel', 'noopener noreferrer')
      node.setAttribute('target', '_blank')
    }
  })
}

export function sanitizeNoteHtml(html) {
  installHooks()
  return DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })
}

/** Plain-text preview for list and table rows. */
export function stripHtml(html) {
  if (!html) return ''
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
