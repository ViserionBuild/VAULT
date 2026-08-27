// Minimal user-agent summarizer for the session picker.
//
// Deliberately not a UA-parsing library: this text is shown to the user to help
// them recognize their own devices, nothing more. It is never used for auth
// decisions, so imprecision is acceptable and an unknown UA degrades to a
// harmless generic label.

function detectBrowser(ua) {
  if (/edg\//i.test(ua)) return 'Edge'
  if (/opr\/|opera/i.test(ua)) return 'Opera'
  if (/chrome|chromium|crios/i.test(ua)) return 'Chrome'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua)) return 'Safari'
  return 'Unknown browser'
}

function detectOs(ua) {
  if (/windows/i.test(ua)) return 'Windows'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/mac os x|macintosh/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Unknown OS'
}

function describeDevice(userAgent) {
  if (!userAgent) return 'Unknown device'
  const ua = String(userAgent)
  return `${detectBrowser(ua)} on ${detectOs(ua)}`
}

// Behind a proxy Express only trusts x-forwarded-for when trust proxy is set,
// which app.js does. Take the left-most entry: the originating client.
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip ?? null
}

module.exports = { describeDevice, clientIp }
