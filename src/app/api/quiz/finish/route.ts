import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { parseOptions } from '@/lib/quiz-engine'

const schema = z.object({ sessionId: z.string().min(10).max(64) })

/** Zavrsava sesiju i vraca kompletan pregled (sada se otkrivaju tacni odgovori). */
export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })
  const rl = rateLimit(`quiz:${userId}`, 60, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Previše zahtjeva.' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Neispravni podaci.' }, { status: 400 })

  const session = await db.quizSession.findFirst({
    where: { id: parsed.data.sessionId, userId },
    include: { answers: { orderBy: { orderIndex: 'asc' } } },
  })
  if (!session) return NextResponse.json({ error: 'Sesija ne postoji.' }, { status: 404 })

  let status = session.status
  if (session.status === 'AKTIVAN') {
    await db.quizSession.update({
      where: { id: session.id },
      data: { status: 'ZAVRSEN', completedAt: new Date() },
    })
    status = 'ZAVRSEN'
  }

  const ids = JSON.parse(session.questionIdsJson) as string[]
  const questions = await db.question.findMany({ where: { id: { in: ids } } })
  const qMap = new Map(questions.map(q => [q.id, q]))

  const review = session.answers.map(a => {
    const q = qMap.get(a.questionId)!
    return {
      orderIndex: a.orderIndex,
      text: q.text,
      passage: q.passage,
      image: q.image,
      topic: q.topic,
      options: parseOptions(q.optionsJson),
      selectedIndex: a.selectedIndex,
      correctIndex: q.correctIndex,
      isCorrect: a.isCorrect,
      solution: q.solutionJson ? JSON.parse(q.solutionJson) : [],
      solutionImages: q.solutionImages ? JSON.parse(q.solutionImages) : [],
    }
  })

  const answered = session.answers.length
  const correct = session.answers.filter(a => a.isCorrect).length
  const percent = answered ? Math.round((correct / answered) * 100) : 0

  return NextResponse.json({
    subject: session.subject,
    school: session.school,
    mode: session.mode,
    status,
    total: session.total,
    answered,
    correct,
    percent,
    review,
  })
}
