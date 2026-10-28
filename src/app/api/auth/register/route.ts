import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, createSessionToken, setAuthCookie } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().trim().min(2, 'Ime mora imati najmanje 2 slova').max(60),
  email: z.string().trim().toLowerCase().email('Neispravan email'),
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 znakova').max(100),
})

export async function POST(req: Request) {
  const rl = rateLimit(`reg:${clientIp(req)}`, 10, 60_000)
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
  const { name, email, password } = parsed.data
  const exists = await db.user.findUnique({ where: { email } })
  if (exists) {
    return NextResponse.json(
      { error: 'Korisnik sa ovim emailom već postoji.' },
      { status: 409 }
    )
  }
  const passwordHash = await hashPassword(password)
  const user = await db.user.create({ data: { name, email, passwordHash } })
  const token = await createSessionToken(user.id, user.email)
  await setAuthCookie(token)
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
}
