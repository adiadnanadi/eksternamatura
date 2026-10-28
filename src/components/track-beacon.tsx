'use client'

import { useEffect } from 'react'

// Šalje beacon POST /api/track jednom po učitavanju stranice.
// Geo (država/grad) se povlači iz ipwho.is-a i kešira 24h u localStorage —
// fetch radi BROWSER, ne Render servis (ne troši outband sa servisa).

type Geo = { country?: string; city?: string; t: number }

export function TrackBeacon() {
  useEffect(() => {
    const send = async () => {
      try {
        let geo: Geo | null = null
        try {
          geo = JSON.parse(localStorage.getItem('kviz_geo') || 'null')
        } catch {
          geo = null
        }
        if (!geo || Date.now() - geo.t > 24 * 60 * 60 * 1000) {
          try {
            const r = await fetch('https://ipwho.is/')
            const j = await r.json()
            if (j && j.success) {
              geo = {
                country: (j.country_code || j.country || '').slice(0, 8) || undefined,
                city: (j.city || '').slice(0, 80) || undefined,
                t: Date.now(),
              }
              localStorage.setItem('kviz_geo', JSON.stringify(geo))
            }
          } catch {
            geo = null
          }
        }
        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            path: location.pathname,
            referrer: document.referrer || null,
            country: geo?.country || null,
            city: geo?.city || null,
          }),
        })
      } catch {
        // tiho — statistika nikad ne smije kvariti app
      }
    }
    send()
  }, [])

  return null
}
