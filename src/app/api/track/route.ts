import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { classifySource, classifyDevice, isBot } from '@/lib/visit-source'
const schema = z.object({
  sid: z.string().max(64).optional(),
  path: z.string().max(180).optional(),
  referrer: z.string().max(500).nullish(),
  country: z.string().max(8).nullish(),
  city: z.string().max(80).nullish(),
})

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent')
  if (isBot(ua)) return new NextResponse(null, { status: 204 })

  const rl = rateLimit(`track:${clientIp(req)}`, 30, 60_000)
  if (!rl.ok) return new NextResponse(null, { status: 204 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return new NextResponse(null, { status: 204 })

  const { sid, path, referrer, country, city } = parsed.data
  const finalPath = (path && path.startsWith('/') ? path : '/').slice(0, 180)
  const host = req.headers.get('host') || ''

  // Admin (vlasnik) se nikad ne broji — njegovi refresh-ovi ne pune statistiku
  let session: { uid: string; email: string } | null = null
  try {
    session = await getSessionUser()
  } catch {
    session = null
  }
  if (session && isAdminEmail(session.email)) return new NextResponse(null, { status: 204 })

  // /admin mogu posjetiti samo admini — nikad ne ulazi u statistiku
  if (finalPath === '/admin' || finalPath.startsWith('/admin/')) {
    return new NextResponse(null, { status: 204 })
  }

  // Geo: Cloudflare header ima prednost (tačniji), fallback je klijentov fetch (ipwho.is)
  const cfCountry = (req.headers.get('cf-ipcountry') || '').trim()
  const cfCity = (req.headers.get('cf-ipcity') || '').trim()
  const finalCountry = (cfCountry || country || '?').toUpperCase().slice(0, 8)
  const finalCity = cfCity || (city ? city.slice(0, 80) : null)

  try {
    const ip = clientIp(req)
    await db.visit.create({
      data: {
        sid: sid || null,
        path: finalPath,
        referrer: referrer || null,
        source: classifySource(referrer, host),
        country: finalCountry,
        city: finalCity,
        device: classifyDevice(ua),
        ip: ip === 'local' ? null : ip,
        userId: session?.uid ?? null,
      },
    })
  } catch {
    // nikad ne ruši stranicu zbog statistike
  }
  return new NextResponse(null, { status: 204 })
}
