import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { parseOptions } from '@/lib/quiz-engine'

const schema = z.object({
  sessionId: z.string().min(10).max(64),
  selectedIndex: z.number().int().min(0).max(4),
})

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
    return NextResponse.json({ error: 'Sesija je završena.' }, { status: 409 })
  }

  const ids = JSON.parse(session.questionIdsJson) as string[]
  const idx = session.currentIndex
  if (idx >= ids.length) {
    return NextResponse.json({ error: 'Nema više pitanja.' }, { status: 409 })
  }

  // sprječava dupli odgovor na isto pitanje
  const already = await db.quizAnswer.findFirst({
    where: { sessionId: session.id, orderIndex: idx },
  })
  if (already) {
    return NextResponse.json({ error: 'Ovo pitanje je već odgovoreno.' }, { status: 409 })
  }

  const questionId = ids[idx]
  const q = await db.question.findUnique({ where: { id: questionId } })
  if (!q) return NextResponse.json({ error: 'Pitanje ne postoji.' }, { status: 404 })

  const isCorrect = parsed.data.selectedIndex === q.correctIndex

  await db.quizAnswer.create({
    data: {
      sessionId: session.id,
      questionId,
      orderIndex: idx,
      selectedIndex: parsed.data.selectedIndex,
      isCorrect,
    },
  })

  const nextIndex = idx + 1
  const done = nextIndex >= session.total
  await db.quizSession.update({
    where: { id: session.id },
    data: {
      currentIndex: nextIndex,
      correctCount: { increment: isCorrect ? 1 : 0 },
      ...(done ? { status: 'ZAVRSEN', completedAt: new Date() } : {}),
    },
  })

  const progress = {
    index: idx,
    total: session.total,
    answered: nextIndex,
    correctCount: session.correctCount + (isCorrect ? 1 : 0),
    finished: done,
  }

  // MOD UČENJA: odmah otkrij ispravnost + tačan odgovor + rješenje (samo za OVO pitanje)
  if (session.mode === 'UCENJE') {
    return NextResponse.json({
      isCorrect,
      correctIndex: q.correctIndex,
      options: parseOptions(q.optionsJson),
      solution: q.solutionJson ? JSON.parse(q.solutionJson) : [],
      solutionImages: q.solutionImages ? JSON.parse(q.solutionImages) : [],
      progress,
    })
  }

  // MOD TESTIRANJA: bez ikakvog otkrivanja ispravnosti
  return NextResponse.json({ received: true, progress })
}
