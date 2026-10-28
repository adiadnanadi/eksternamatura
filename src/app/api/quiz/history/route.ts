import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 })

  const sessions = await db.quizSession.findMany({
    where: { userId, status: 'ZAVRSEN' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const history = sessions.map(s => ({
    id: s.id,
    subject: s.subject,
    school: s.school,
    mode: s.mode,
    total: s.total,
    correct: s.correctCount,
    answeredCount: s.currentIndex,
    percent: s.currentIndex ? Math.round((s.correctCount / s.currentIndex) * 100) : 0,
    createdAt: s.createdAt,
    completedAt: s.completedAt,
  }))

  // globalna statistika po predmetu + školskom nivou
  const agg = await db.quizAnswer.findMany({
    where: { session: { userId, mode: 'TEST' } },
    select: { isCorrect: true, session: { select: { subject: true, school: true } } },
  })
  const bySubject: Record<string, { correct: number; total: number }> = {}
  for (const a of agg) {
    const key = `${a.session.school}:${a.session.subject}`
    const s = (bySubject[key] ||= { correct: 0, total: 0 })
    s.total++
    if (a.isCorrect) s.correct++
  }

  return NextResponse.json({ history, bySubject })
}
