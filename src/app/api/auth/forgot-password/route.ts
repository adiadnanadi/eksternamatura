import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/mailer'

const schema = z.object({ email: z.string().trim().toLowerCase().email() })
const HOUR = 60 * 60 * 1000

// Zaboravljena lozinka — šalje link za reset. Uvijek isti odgovor
// da se ne otkrije da li email postoji (anti-enumeration).
export async function POST(req: Request) {
  const ip = clientIp(req)
  const rl = rateLimit(`forgot:${ip}`, 5, HOUR)
  if (!rl.ok) return NextResponse.json({ ok: true })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: true })

  const email = parsed.data.email
  const rlEmail = rateLimit(`forgote:${email}`, 3, HOUR)
  if (!rlEmail.ok) return NextResponse.json({ ok: true })

  try {
    const user = await db.user.findUnique({ where: { email } })
    if (user) {
      const resetToken = randomBytes(32).toString('hex')
      await db.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiresAt: new Date(Date.now() + HOUR) },
      })
      // ne čekamo rezultat — odgovor je uvijek isti
      sendPasswordResetEmail(user.email, user.name, resetToken).catch(() => {})
    }
  } catch {
    // tiho
  }
  return NextResponse.json({ ok: true })
}
