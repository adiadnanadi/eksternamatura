import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { pickQuestionIds, publicQuestion, testCount, type Subject, type Mode, type School } from '@/lib/quiz-engine'

const schema = z.object({
  subject: z.enum(['MATEMATIKA', 'BOSANSKI', 'ENGLESKI']),
  school: z.enum(['OSNOVNA', 'SREDNJA']),
  mode: z.enum(['UCENJE', 'TEST']),
  count: z.number().int().min(5).max(20).optional(),
  topic: z.string().trim().max(60).optional().nullable(),
})

export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })

  const rl = rateLimit(`quiz:${userId}`, 60, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Previše zahtjeva. Pokušajte za ${rl.retryAfterSec}s.` },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Neispravni podaci.' }, { status: 400 })
  }
  const { subject, mode, school } = parsed.data
  const topic = parsed.data.topic || null

  // prekini napustene AKTIVNE sesije istog predmeta+nivoa (jedna aktivna po kombinaciji)
  await db.quizSession.updateMany({
    where: { userId, subject, school, status: 'AKTIVAN' },
    data: { status: 'PREKINUT' },
  })

  const count = mode === 'TEST' ? testCount(subject as Subject, school as School) : parsed.data.count ?? 10
  const ids = await pickQuestionIds(subject as Subject, school as School, mode as Mode, count, topic)
  if (ids.length === 0) {
    return NextResponse.json({ error: 'Nema pitanja za odabrani kriterij.' }, { status: 400 })
  }

  const session = await db.quizSession.create({
    data: {
      userId,
      subject,
      school,
      mode,
      status: 'AKTIVAN',
      questionIdsJson: JSON.stringify(ids),
      total: ids.length,
      currentIndex: 0,
    },
  })

  const first = await db.question.findUnique({ where: { id: ids[0] } })
  if (!first) return NextResponse.json({ error: 'Greška pri učitavanju.' }, { status: 500 })

  return NextResponse.json({
    sessionId: session.id,
    mode,
    subject,
    school,
    total: ids.length,
    question: publicQuestion(first),
  })
}
