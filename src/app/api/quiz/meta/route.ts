import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { testCount, type Subject, type School } from '@/lib/quiz-engine'

/** Javni metapodaci: broj pitanja po školskom nivou/predmetu/temi + dužina testa. Bez sadržaja pitanja. */
export async function GET() {
  const rows = await db.question.groupBy({
    by: ['school', 'subject', 'topic'],
    _count: true,
  })
  const schools: Record<
    string,
    Record<string, { total: number; topics: Record<string, number>; testTotal: number }>
  > = {}
  for (const r of rows) {
    const school = (schools[r.school] ||= {})
    const s = (school[r.subject] ||= { total: 0, topics: {}, testTotal: 0 })
    s.total += r._count
    s.topics[r.topic] = (s.topics[r.topic] || 0) + r._count
    s.testTotal = testCount(r.subject as Subject, r.school as School)
  }
  return NextResponse.json({ schools })
}
