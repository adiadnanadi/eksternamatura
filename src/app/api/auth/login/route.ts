import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifyPassword, createSessionToken, setAuthCookie } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Neispravan email'),
  password: z.string().min(1, 'Unesite lozinku'),
})

export async function POST(req: Request) {
  const rl = rateLimit(`login:${clientIp(req)}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Previše pokušaja. Pokušajte za ${rl.retryAfterSec}s.` },
      { status: 429 }
    )
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Neispravni podaci' },
      { status: 400 }
    )
  }
  const { email, password } = parsed.data
  const user = await db.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: 'Neispravan email ili lozinka.' },
      { status: 401 }
    )
  }
  const token = await createSessionToken(user.id, user.email)
  await setAuthCookie(token)
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
}
