import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { publicQuestion } from '@/lib/quiz-engine'

const schema = z.object({ sessionId: z.string().min(10).max(64) })

export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })
  const rl = rateLimit(`quiz:${userId}`, 60, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Previše zahtjeva.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Neispravni podaci.' }, { status: 400 })

  const session = await db.quizSession.findFirst({
    where: { id: parsed.data.sessionId, userId },
  })
  if (!session) return NextResponse.json({ error: 'Sesija ne postoji.' }, { status: 404 })
  if (session.status !== 'AKTIVAN') {
    return NextResponse.json({ finished: true, status: session.status })
  }

  const ids = JSON.parse(session.questionIdsJson) as string[]
  const idx = session.currentIndex
  if (idx >= ids.length) {
    return NextResponse.json({ finished: true, status: session.status })
  }
  const q = await db.question.findUnique({ where: { id: ids[idx] } })
  if (!q) return NextResponse.json({ error: 'Greška pri učitavanju.' }, { status: 500 })

  return NextResponse.json({
    question: publicQuestion(q),
    index: idx,
    total: session.total,
    correctCount: session.correctCount,
  })
}
