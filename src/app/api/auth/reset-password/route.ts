import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, createSessionToken, setAuthCookie } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Neispravan link'),
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 znakova').max(100),
})

// Postavlja novu lozinku jednokratnim linkom (jednokratni token, rok 1h).
export async function POST(req: Request) {
  const rl = rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60_000)
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
  const { token, password } = parsed.data

  let user
  try {
    user = await db.user.findUnique({ where: { resetToken: token } })
  } catch {
    user = null
  }
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'Link je nevažeći, istekao ili je već iskorišten.' },
      { status: 400 }
    )
  }

  const passwordHash = await hashPassword(password)
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
      // prilikom resete smijemo i automatski potvrditi email (vlasnik dokazao kontrolu nad inboxom)
      emailVerified: user.emailVerified ?? new Date(),
    },
  })

  const sessionToken = await createSessionToken(user.id, user.email)
  await setAuthCookie(sessionToken)
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
}
