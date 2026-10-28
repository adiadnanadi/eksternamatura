import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { hashPassword, createSessionToken, setAuthCookie } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { sendVerificationEmail } from '@/lib/mailer'

const schema = z.object({
  name: z.string().trim().min(2, 'Ime mora imati najmanje 2 slova').max(60),
  email: z.string().trim().toLowerCase().email('Neispravan email'),
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 znakova').max(100),
})

export async function POST(req: Request) {
  const ip = clientIp(req)
  const rl = rateLimit(`reg:${ip}`, 5, 60_000)
  const rlDay = rateLimit(`regd:${ip}`, 20, 60 * 60_000)
  if (!rl.ok || !rlDay.ok) {
    return NextResponse.json(
      { error: `Previše pokušaja. Pokušajte za ${(!rl.ok ? rl : rlDay).retryAfterSec}s.` },
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
      { error: 'Korisnik sa ovim emailom već postoji. Ako je tvoj — prijavi se.' },
      { status: 409 }
    )
  }
  const passwordHash = await hashPassword(password)
  const verificationToken = randomBytes(32).toString('hex')
  const user = await db.user.create({
    data: { name, email, passwordHash, verificationToken },
  })

  // Pošalji verifikacioni email; ako SMTP nije podešen ili slanje stvarno
  // nije uspjelo — auto-verifikuj da app nikad ne ostane blokiran.
  const sent = await sendVerificationEmail(email, name, verificationToken)
  if (sent) {
    return NextResponse.json({ needsVerification: true })
  }
  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verificationToken: null },
  })
  const token = await createSessionToken(user.id, user.email)
  await setAuthCookie(token)
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    needsVerification: false,
  })
}
