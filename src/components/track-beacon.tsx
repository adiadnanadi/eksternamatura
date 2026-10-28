'use client'

import { useEffect } from 'react'
import { getVisitSid, alreadyTracked, markTracked } from '@/lib/visit-client'

// Šalje beacon POST /api/track samo pri PRVOM dolasku u sesiji (tab).
// Refresh/ponovno učitavanje u istom tabu NE šalje ponovo — statistika
// pokazuje osobu kad je nova pristupila, ne svaki refresh.
// Ako se korisnik kasnije uloguje, identifyVisit() u client.ts povezuje
// istu posjetu (sid) sa njegovim nalogom → email se pojavljuje u panelu.
// Geo (država/grad) se povlači iz ipwho.is-a i kešira 24h u localStorage —
// fetch radi BROWSER, ne Render servis (ne troši outband sa servisa).

type Geo = { country?: string; city?: string; t: number }

export function TrackBeacon() {
  useEffect(() => {
    // već zabilježena posjeta u ovoj sesiji (isti tab) → bez ponavljanja
    if (alreadyTracked()) return

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
        const res = await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            sid: getVisitSid(),
            path: location.pathname,
            referrer: document.referrer || null,
            country: geo?.country || null,
            city: geo?.city || null,
          }),
        })
        // bilježi "već viđeno" samo ako je server prihvatio (204)
        if (res.ok || res.status === 204) {
          markTracked()
        }
      } catch {
        // tiho — statistika nikad ne smije kvariti app
      }
    }
    send()
  }, [])

  return null
}
