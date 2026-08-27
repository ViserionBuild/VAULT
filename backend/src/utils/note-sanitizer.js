const sanitizeHtml = require('sanitize-html')

/**
 * Server-side note sanitizer.
 *
 * The previous config dropped `span` and every `style` attribute, so text
 * colour, highlighting and sizing were destroyed on write — permanently, in
 * the database. This keeps presentational styling while still refusing
 * scripts, event handlers, and anything that can load a remote resource.
 *
 * Mirrors the client whitelist in frontend/src/lib/note-html.js; the two must
 * stay in step or content will render differently from how it was stored.
 */
const SAFE_STYLE_PROPS = [
  'color',
  'background-color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-align',
  'text-decoration',
  'line-height',
  'padding-left',
  'margin-left',
]

// sanitize-html matches style values against regexes; these accept ordinary
// CSS values but not url(...) or expression(...).
const styleMatcher = [/^(?!.*(?:url\s*\(|expression\s*\())[^;{}]*$/i]
const allowedStyles = {
  '*': Object.fromEntries(SAFE_STYLE_PROPS.map((prop) => [prop, styleMatcher])),
}

const NOTE_SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br', 'div', 'span',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'mark',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code', 'hr',
    'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img',
    'input',
    'font',
  ],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    img: ['src', 'alt'],
    // Checklist boxes only; no name/value that could post anywhere.
    input: ['type', 'checked', 'disabled'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    '*': ['style', 'class'],
  },
  allowedStyles,
  allowedSchemes: ['http', 'https', 'mailto'],
  // Inline images are allowed as data URIs; other schemes are not.
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  transformTags: {
    // execCommand('foreColor'/'hiliteColor') can emit <font color> instead of a
    // styled span. Convert to a span so the colour survives rather than being
    // dropped with the tag.
    font: (tagName, attribs) => {
      const styles = []
      if (attribs.color) styles.push(`color:${attribs.color}`)
      if (attribs.style) styles.push(attribs.style)
      return {
        tagName: 'span',
        attribs: styles.length ? { style: styles.join(';') } : {},
      }
    },
    // Any surviving input is forced to a checkbox.
    input: (tagName, attribs) => ({
      tagName: 'input',
      attribs: { type: 'checkbox', ...(attribs.checked !== undefined ? { checked: 'checked' } : {}) },
    }),
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
}

function sanitizeNoteContent(html) {
  return sanitizeHtml(html ?? '', NOTE_SANITIZE_OPTIONS)
}

module.exports = { sanitizeNoteContent, NOTE_SANITIZE_OPTIONS }
