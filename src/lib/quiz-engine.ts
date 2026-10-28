import 'server-only'
import { db } from '@/lib/db'

export type Subject = 'MATEMATIKA' | 'BOSANSKI' | 'ENGLESKI'
export type Mode = 'UCENJE' | 'TEST'
export type Level = 'OSNOVNI' | 'SREDNJI' | 'VISI'
export type School = 'OSNOVNA' | 'SREDNJA'

/** Struktura ispita po predmetu i školskom nivou (iz STAT sheetova). null = nema pitanja. */
export const SUBJECTS: Record<
  Subject,
  {
    label: string
    icon: string
    schools: Partial<Record<School, { testMix: Record<Level, number> }>>
  }
> = {
  MATEMATIKA: {
    label: 'Matematika',
    icon: 'Sigma',
    schools: {
      OSNOVNA: { testMix: { OSNOVNI: 4, SREDNJI: 4, VISI: 2 } }, // banka za osnovnu (267): 40/40/20 → 10
      SREDNJA: { testMix: { OSNOVNI: 4, SREDNJI: 4, VISI: 2 } }, // banka za srednju (313): 40/40/20 → 10
    },
  },
  BOSANSKI: {
    label: 'Bosanski jezik',
    icon: 'BookOpen',
    schools: {
      OSNOVNA: { testMix: { OSNOVNI: 4, SREDNJI: 4, VISI: 2 } }, // BOS-STAT (osnovna): 40/40/20 → 10
      SREDNJA: { testMix: { OSNOVNI: 8, SREDNJI: 8, VISI: 4 } }, // BOS-STAT (srednja): 40/40/20 → 20
    },
  },
  ENGLESKI: {
    label: 'Engleski jezik',
    icon: 'Globe',
    schools: {
      OSNOVNA: { testMix: { OSNOVNI: 3, SREDNJI: 4, VISI: 3 } }, // ENG-STAT (osnovna): 36/36/28 → 10
      SREDNJA: { testMix: { OSNOVNI: 7, SREDNJI: 7, VISI: 6 } }, // ENG-STAT (srednja): 36/36/28 → 20
    },
  },
}

export function testCount(subject: Subject, school: School): number {
  const cfg = SUBJECTS[subject]?.schools[school]
  if (!cfg) return 10
  return Object.values(cfg.testMix).reduce((a, b) => a + b, 0)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Bira pitanja za sesiju.
 * TEST: po rasporedu ispita (mix po nivoima iz stat sheetova).
 * UCENJE: proporcionalna mjesavina nivoa, opciono filtrirana po temi.
 */
export async function pickQuestionIds(
  subject: Subject,
  school: School,
  mode: Mode,
  count: number,
  topic?: string | null
): Promise<string[]> {
  const where: any = { subject, school }
  if (topic) where.topic = topic
  const pool = await db.question.findMany({
    where,
    select: { id: true, level: true },
  })
  const byLevel: Record<Level, string[]> = { OSNOVNI: [], SREDNJI: [], VISI: [] }
  for (const q of pool) byLevel[q.level as Level]?.push(q.id)
  for (const lvl of Object.keys(byLevel) as Level[]) byLevel[lvl] = shuffle(byLevel[lvl])

  let mix: Record<Level, number>
  if (mode === 'TEST') {
    mix = SUBJECTS[subject].schools[school]!.testMix
  } else {
    // proporcije 40/40/20 zaokruzeno na trazeni broj
    const nB = Math.round(count * 0.4)
    const nS = Math.round(count * 0.4)
    const nV = count - nB - nS
    mix = { OSNOVNI: nB, SREDNJI: nS, VISI: nV }
  }

  const chosen: string[] = []
  for (const lvl of ['OSNOVNI', 'SREDNJI', 'VISI'] as Level[]) {
    const want = Math.min(mix[lvl], byLevel[lvl].length)
    chosen.push(...byLevel[lvl].slice(0, want))
  }
  // popuni manjak iz preostalog bazena (bilo kog nivoa)
  if (chosen.length < count) {
    const rest = shuffle(pool.map(q => q.id).filter(id => !chosen.includes(id)))
    chosen.push(...rest.slice(0, count - chosen.length))
  }
  return shuffle(chosen).slice(0, count)
}

/** Opcije u bazi: [{t: tekst, img: slika|null}] (stari format: običan string). */
export function parseOptions(json: string): { text: string; image: string | null }[] {
  const raw = JSON.parse(json) as (string | { t: string; img: string | null })[]
  return raw.map(o =>
    typeof o === 'string' ? { text: o, image: null } : { text: o.t ?? '', image: o.img ?? null }
  )
}

/** Javni oblik pitanja — BEZ correctIndex i rjesenja! */
export function publicQuestion(q: {
  id: string
  subject: string
  school: string
  topic: string
  level: string
  text: string
  passage: string | null
  image: string | null
  optionsJson: string
}) {
  return {
    id: q.id,
    subject: q.subject,
    school: q.school,
    topic: q.topic,
    level: q.level,
    text: q.text,
    passage: q.passage,
    image: q.image,
    options: parseOptions(q.optionsJson),
  }
}
