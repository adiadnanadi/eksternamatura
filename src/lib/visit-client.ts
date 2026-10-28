'use client'

// Klijentska strana statistike posjeta.
// svaki tab (sesija) ima svoj sid — beacon ga šalje uz posjetu,
// a nakon logina/registracije identifyVisit() povezuje ISTU posjetu sa nalogom
// tako da admin vidi email korisnika koji je bio aktivan.

const SID_KEY = 'kviz_sid'
const FLAG_KEY = 'kviz_session_tracked'

export function getVisitSid(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY)
    if (!sid) {
      sid = crypto.randomUUID()
      sessionStorage.setItem(SID_KEY, sid)
    }
    return sid
  } catch {
    return crypto.randomUUID()
  }
}

export function alreadyTracked(): boolean {
  try {
    return sessionStorage.getItem(FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function markTracked(): void {
  try {
    sessionStorage.setItem(FLAG_KEY, '1')
  } catch {
    // ignore
  }
}

// Pozvati ODMAH nakon uspješnog login-a/registracije:
// posjeta iz ovog sessiona dobija userId → email se prikazuje u admin panelu.
export function identifyVisit(): void {
  try {
    const sid = getVisitSid()
    fetch('/api/track/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ sid }),
    }).catch(() => {})
  } catch {
    // ignore
  }
}
