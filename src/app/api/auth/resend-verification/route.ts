import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { sendVerificationEmail } from '@/lib/mailer'

const schema = z.object({ email: z.string().trim().toLowerCase().email() })

// Ponovno slanje verifikacionog emaila. Uvijek200 da se ne otkrije
// da li email postoji (anti-enumeration).
export async function POST(req: Request) {
  const ip = clientIp(req)
  const rl = rateLimit(`resend:${ip}`, 5, 60 * 60_000)
  if (!rl.ok) return NextResponse.json({ ok: true })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: true })

  const email = parsed.data.email
  const rlEmail = rateLimit(`resende:${email}`, 3, 60 * 60_000)
  if (!rlEmail.ok) return NextResponse.json({ ok: true })

  try {
    const user = await db.user.findUnique({ where: { email } })
    if (user && !user.emailVerified) {
      const verificationToken = randomBytes(32).toString('hex')
      await db.user.update({
        where: { id: user.id },
        data: { verificationToken },
      })
      await sendVerificationEmail(user.email, user.name, verificationToken)
    }
  } catch {
    // tiho
  }
  return NextResponse.json({ ok: true })
}
