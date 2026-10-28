// Klasifikacija posjete: odakle je korisnik došao (referrer → izvor),
// tip uređaja iz user-agenta i filter botova.

export function classifySource(referrer: string | null | undefined, currentHost: string): string {
  if (!referrer) return 'Direktno'
  let refHost: string
  try {
    refHost = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'Ostalo'
  }
  const cur = currentHost.toLowerCase().replace(/^www\./, '')
  if (refHost === cur) return 'Direktno'

  const rules: [RegExp, string][] = [
    [/(^|\.)google\./, 'Google'],
    [/(^|\.)bing\./, 'Bing'],
    [/(^|\.)yahoo\./, 'Yahoo'],
    [/(^|\.)duckduckgo\./, 'DuckDuckGo'],
    [/(^|\.)yandex\./, 'Yandex'],
    [/(^|\.)instagram\./, 'Instagram'],
    [/(^|\.)(facebook\.|fb\.)/, 'Facebook'],
    [/whatsapp|(^|\.)wa\.me$/, 'WhatsApp'],
    [/(^|\.)youtube\./, 'YouTube'],
    [/(^|\.)tiktok\./, 'TikTok'],
    [/(^|\.)(x\.com|twitter\.)$/, 'X (Twitter)'],
    [/(^|\.)linkedin\./, 'LinkedIn'],
    [/(^|\.)reddit\./, 'Reddit'],
    [/telegram|(^|\.)t\.me$/, 'Telegram'],
    [/(^|\.)pinterest\./, 'Pinterest'],
    [/mail\.google|outlook|(^|\.)hotmail\./, 'Email'],
  ]
  for (const [re, name] of rules) {
    if (re.test(refHost)) return name
  }
  // nepoznat domen — prikaži sam domen (skupi se u grupu "Ostalo" ako treba)
  return refHost
}

export function classifyDevice(ua: string | null | undefined): string {
  if (!ua) return '?'
  const u = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk|kindle|sm-\w+.*\bgecko\b/.test(u)) return 'Tablet'
  if (/mobi|android|iphone|ipod|windows phone|blackberry|opera mini/.test(u)) return 'Mobitel'
  return 'Desktop'
}

export function isBot(ua: string | null | undefined): boolean {
  if (!ua) return false
  return /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|scanner|curl|wget|python-requests|phantomjs/i.test(ua)
}
