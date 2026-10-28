/**
 * Parser: SrednjaSkolaPitanja (1).xlsx → data/srednja-bosanski.json + data/srednja-engleski.json
 *
 * BOS-STAT (ćelija − 1 = broj pitanja):
 *   Tema:    Pravopis q1-85, Jezik q86-164, Teorija književnosti q165-245, Historija književnosti q246-301
 *   Nivo:    OSNOVNI [1-24,86-118,165-210,246-277], SREDNJI [25-63,119-153,211-237,278-295], VISI [64-85,154-164,238-245,296-301]
 * ENG-STAT (bez tema → passage pitanja = Čitanje i razumijevanje, ostalo = Vokabular i gramatika):
 *   OSNOVNI [1-10,23-30,39-47,64-71,103-117,128-151,222-269,302-309,317-340,357-382]
 *   SREDNJI [11-22,31-38,48-55,72-82,87-102,190-216,270-301,310-316,341-356,383-387,400-407,431-436]
 *   VISI    [56-63,83-87,118-127,152-189,217-221,388-399,408-430,437-475]
 *
 * Pitanja imaju 2-5 opcija (A-E). "Tačan" kolona: "C) tekst", "d. tekst" ili čist tekst (fallback po slaganju).
 */
import * as XLSX from 'xlsx'
import { writeFileSync } from 'fs'

const SRC = '/home/z/my-project/upload/SrednjaSkolaPitanja (1).xlsx'
const OUT_BOS = '/home/z/my-project/data/srednja-bosanski.json'
const OUT_ENG = '/home/z/my-project/data/srednja-engleski.json'

type Range = [number, number]
const BOS_TOPIC: Array<Range & { topic: string }> = [
  { 0: 1, 1: 85, topic: 'Pravopis' },
  { 0: 86, 1: 164, topic: 'Jezik' },
  { 0: 165, 1: 245, topic: 'Teorija književnosti' },
  { 0: 246, 1: 301, topic: 'Historija književnosti' },
] as any
const BOS_LEVEL: Record<string, Range[]> = {
  OSNOVNI: [[1, 24], [86, 118], [165, 210], [246, 277]],
  SREDNJI: [[25, 63], [119, 153], [211, 237], [278, 295]],
  VISI: [[64, 85], [154, 164], [238, 245], [296, 301]],
}
const ENG_LEVEL: Record<string, Range[]> = {
  OSNOVNI: [[1, 10], [23, 30], [39, 47], [64, 71], [103, 117], [128, 151], [222, 269], [302, 309], [317, 340], [357, 382]],
  SREDNJI: [[11, 22], [31, 38], [48, 55], [72, 82], [87, 102], [190, 216], [270, 301], [310, 316], [341, 356], [383, 387], [400, 407], [431, 436]],
  VISI: [[56, 63], [83, 87], [118, 127], [152, 189], [217, 221], [388, 399], [408, 430], [437, 475]],
}

function inRanges(no: number, ranges: Range[]): boolean {
  return ranges.some(([a, b]) => no >= a && no <= b)
}

function levelFor(no: number, map: Record<string, Range[]>): string | null {
  for (const lvl of ['OSNOVNI', 'SREDNJI', 'VISI']) {
    if (inRanges(no, map[lvl])) return lvl
  }
  return null
}

const PREFIX_RE = /^\s*[a-eA-E]\s*[).]\s*/

function clean(s: unknown): string {
  if (s === null || s === undefined) return ''
  let t = String(s).replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  t = t.replace(/[ \t]+/g, ' ')
  t = t.replace(/ *\n */g, '\n')
  t = t.replace(/\n{3,}/g, '\n\n')
  return t.trim()
}

function stripOpt(s: unknown): string {
  return clean(String(s ?? '').replace(PREFIX_RE, ''))
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim()
}

const anomalies: string[] = []

interface Q {
  original_no: number
  subject: string
  topic: string
  level: string
  question: string
  passage: string | null
  options: string[]
  correct_index: number
}

function parseBos(rows: unknown[][]): Q[] {
  const out: Q[] = []
  const data = rows.filter(r => r && r[0] && String(r[0]).trim() !== '').slice(1)
  for (let i = 0; i < data.length; i++) {
    const no = i + 1
    const r = data[i]
    const qRaw = clean(r[0])
    const opts = [1, 2, 3, 4].map(c => stripOpt(r[c]))
    const correctRaw = String(r[5] ?? '')

    // passage: "Pročitaj sljedeći odlomak(!|:)\n\n<tekst>"
    let question = qRaw
    let passage: string | null = null
    const m = qRaw.match(/^(Pročitaj sljedeć[^\n]*?)\n+([\s\S]+)$/i)
    if (m) {
      question = m[1].trim()
      passage = m[2].trim()
    }

    // tačan odgovor: slovo iz "C) ..." ili tekst-match fallback
    let idx: number | null = null
    const lm = correctRaw.trim().match(/^\s*([a-eA-E])\s*[).]/)
    if (lm) {
      const li = lm[1].toUpperCase().charCodeAt(0) - 65
      if (li < opts.length && opts[li]) idx = li
      else anomalies.push(`BOS #${no}: slovo ${lm[1]} van opsega opcija`)
    }
    if (idx === null) {
      const corr = stripOpt(correctRaw)
      idx = opts.findIndex(o => norm(o) === norm(corr))
      if (idx === -1) idx = opts.findIndex(o => norm(o).startsWith(norm(corr).slice(0, 30)) || norm(corr).startsWith(norm(o).slice(0, 30)))
      if (idx === -1) {
        anomalies.push(`BOS #${no}: tačan nije prepoznat: ${correctRaw.slice(0, 60)!}`)
        continue
      }
    }

    const topic = BOS_TOPIC.find(t => no >= (t as any)[0] && no <= (t as any)[1])?.topic
    const level = levelFor(no, BOS_LEVEL)
    if (!topic || !level) {
      anomalies.push(`BOS #${no}: nema mapiranja (topic=${topic}, level=${level})`)
      continue
    }
    out.push({ original_no: no, subject: 'BOSANSKI', topic, level, question, passage, options: opts, correct_index: idx })
  }
  return out
}

function parseEng(rows: unknown[][]): Q[] {
  const out: Q[] = []
  const data = rows.filter(r => r && r[0] && String(r[0]).trim() !== '').slice(1)
  for (let i = 0; i < data.length; i++) {
    const no = i + 1
    const r = data[i]
    const qRaw = clean(r[0])
    const opts = [1, 2, 3, 4, 5].map(c => stripOpt(r[c])).filter(o => o !== '')
    const correctRaw = String(r[6] ?? '')

    // passage split na QUESTION: (bilo koja kombinacija velikih/malih slova)
    let question = qRaw
    let passage: string | null = null
    const split = qRaw.split(/\bQUESTION\s*:\s*/i)
    if (split.length === 2) {
      passage = split[0].trim()
      question = split[1].trim()
    } else if (split.length > 2) {
      anomalies.push(`ENG #${no}: više QUESTION markera (${split.length - 1}) — uzet prvi`)
      passage = split[0].trim()
      question = split[1].trim()
    }

    let idx: number | null = null
    const lm = correctRaw.trim().match(/^\s*([a-eA-E])\s*[).]/)
    if (lm) {
      const li = lm[1].toUpperCase().charCodeAt(0) - 65
      if (li < opts.length && opts[li]) idx = li
      else anomalies.push(`ENG #${no}: slovo ${lm[1]} van opsega (opcija=${opts.length})`)
    }
    if (idx === null) {
      const corr = stripOpt(correctRaw)
      idx = opts.findIndex(o => norm(o) === norm(corr))
      if (idx === -1) idx = opts.findIndex(o => norm(o).startsWith(norm(corr).slice(0, 30)) || norm(corr).startsWith(norm(o).slice(0, 30)))
      if (idx === -1) {
        anomalies.push(`ENG #${no}: tačan nije prepoznat: ${correctRaw.slice(0, 60)}`)
        continue
      }
    }

    const level = levelFor(no, ENG_LEVEL)
    if (!level) {
      anomalies.push(`ENG #${no}: nema nivo mapiranja`)
      continue
    }
    const topic = passage ? 'Čitanje i razumijevanje' : 'Vokabular i gramatika'
    out.push({ original_no: no, subject: 'ENGLESKI', topic, level, question, passage, options: opts, correct_index: idx })
  }
  return out
}

function main() {
  const wb = XLSX.readFile(SRC)
  const bosAll = XLSX.utils.sheet_to_json(wb.Sheets['BosanskiJezik'], { header: 1 }) as unknown[][]
  const engAll = XLSX.utils.sheet_to_json(wb.Sheets['engleski jezik'], { header: 1 }) as unknown[][]

  const bos = parseBos(bosAll)
  const eng = parseEng(engAll)

  writeFileSync(OUT_BOS, JSON.stringify(bos, null, 1), 'utf-8')
  writeFileSync(OUT_ENG, JSON.stringify(eng, null, 1), 'utf-8')

  const cnt = (qs: Q[]) => {
    const m = new Map<string, number>()
    for (const q of qs) {
      const k = `${q.topic} / ${q.level}`
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()].sort().map(([k, v]) => `  ${k}: ${v}`).join('\n')
  }
  const optDist = (qs: Q[]) => {
    const m = new Map<number, number>()
    for (const q of qs) m.set(q.options.length, (m.get(q.options.length) ?? 0) + 1)
    return [...m.entries()].sort().map(([k, v]) => `${k} opcija: ${v}`).join(', ')
  }
  const passCount = (qs: Q[]) => qs.filter(q => q.passage).length

  console.log(`BOS: ${bos.length} pitanja (passage: ${passCount(bos)}) → ${OUT_BOS}`)
  console.log(cnt(bos))
  console.log(`  opcije → ${optDist(bos)}`)
  console.log(`\nENG: ${eng.length} pitanja (passage: ${passCount(eng)}) → ${OUT_ENG}`)
  console.log(cnt(eng))
  console.log(`  opcije → ${optDist(eng)}`)
  console.log(`\nANOMALIJE (${anomalies.length}):`)
  for (const a of anomalies) console.log('  ' + a)
}

main()
