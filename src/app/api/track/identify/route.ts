import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({ sid: z.string().min(8).max(64) })

// Povezuje posjetu (sid iz istog browser-taba) sa nalogom NAKON logina/registracije,
// da admin panel prikaže email korisnika koji je bio aktivan.
export async function POST(req: Request) {
  const rl = rateLimit(`identify:${clientIp(req)}`, 30, 60_000)
  if (!rl.ok) return new NextResponse(null, { status: 204 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return new NextResponse(null, { status: 204 })

  let session: { uid: string; email: string } | null = null
  try {
    session = await getSessionUser()
  } catch {
    session = null
  }
  // nepoznat ili admin (vlasnik) → ništa se ne povezuje
  if (!session || isAdminEmail(session.email)) return new NextResponse(null, { status: 204 })

  try {
    await db.visit.updateMany({
      where: { sid: parsed.data.sid, userId: null },
      data: { userId: session.uid },
    })
  } catch {
    // tiho
  }
  return new NextResponse(null, { status: 204 })
}
