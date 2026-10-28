import * as XLSX from 'xlsx'

const wb = XLSX.readFile('/home/z/my-project/upload/SrednjaSkolaPitanja (1).xlsx')
const bosAll = XLSX.utils.sheet_to_json(wb.Sheets['BosanskiJezik'], { header: 1 }) as unknown[][]
const engAll = XLSX.utils.sheet_to_json(wb.Sheets['engleski jezik'], { header: 1 }) as unknown[][]

function dataRows(rows: unknown[][], cols: number): unknown[][] {
  return rows.filter(r => r && r[0] && String(r[0]).trim() !== '').slice(1)
}

const bos = dataRows(bosAll, 6)
const eng = dataRows(engAll, 7)

console.log('BOS redova:', bos.length, '| ENG redova:', eng.length)

// validacija Tačan kolone
const letterRe = /^\s*([a-eA-E])\)/
let badBos = 0, badEng = 0
for (let i = 0; i < bos.length; i++) {
  const c = bos[i][5]
  if (!c || !letterRe.test(String(c))) { badBos++; if (badBos <= 5) console.log(`BOS #${i + 1} Tačan:`, JSON.stringify(c)) }
}
for (let i = 0; i < eng.length; i++) {
  const c = eng[i][6]
  if (!c || !letterRe.test(String(c))) { badEng++; if (badEng <= 5) console.log(`ENG #${i + 1} Tačan:`, JSON.stringify(c)) }
}
console.log(`Tačan bez slova: BOS=${badBos}, ENG=${badEng}`)

// provjera da li Tačan tekst odgovara slovu opcije
function stripOpt(s: unknown): string {
  return String(s ?? '').replace(/^\s*[a-eA-E]\)\s*/, '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 60)
}
let mismatch = 0
for (let i = 0; i < bos.length; i++) {
  const c = String(bos[i][5] ?? '')
  const m = c.match(letterRe)
  if (!m) continue
  const letter = m[1].toUpperCase()
  const li = letter.charCodeAt(0) - 65
  const optText = stripOpt(bos[i][1 + li])
  const corrText = stripOpt(c)
  if (optText !== corrText) { mismatch++; if (mismatch <= 5) console.log(`BOS #${i + 1}: slovo ${letter} ≠ tekst: opt=${optText.slice(0, 40)} corr=${corrText.slice(0, 40)}`) }
}
console.log('BOS slovo↔tekst neusklađeno:', mismatch)

// Zadnja 3 BOS pitanja (passage?)
console.log('\n=== BOS #299-301 ===')
for (let i = bos.length - 3; i < bos.length; i++) {
  console.log(`--- #${i + 1}:`, JSON.stringify(String(bos[i][0]).slice(0, 350)))
  console.log('    opts:', JSON.stringify([bos[i][1], bos[i][2], bos[i][3], bos[i][4]].map(o => String(o ?? '').slice(0, 80))))
  console.log('    tačan:', JSON.stringify(String(bos[i][5] ?? '').slice(0, 80)))
}

// ENG sa QUESTION markerom — primjeri
console.log('\n=== ENG primjeri sa QUESTION: ===')
let shown = 0
for (let i = 0; i < eng.length && shown < 2; i++) {
  if (String(eng[i][0]).includes('QUESTION:')) {
    shown++
    console.log(`--- #${i + 1}:`, JSON.stringify(String(eng[i][0]).slice(0, 400)))
    console.log('    opts:', JSON.stringify([1, 2, 3, 4, 5].map(c => String(eng[i][c] ?? '').slice(0, 60))))
    console.log('    tačan:', JSON.stringify(String(eng[i][6] ?? '').slice(0, 60)))
  }
}

// ENG sa "Read text" prefiksom bez QUESTION
let readPrefix = 0
for (const r of eng) if (/read\s+text\s+and\s+then/i.test(String(r[0]).slice(0, 60))) readPrefix++
console.log('\nENG sa "Read text..." prefiksom:', readPrefix)

// ENG: opcije nekontinualne? (npr. a prazno, b-e pune)
let noncontig = 0
for (let i = 0; i < eng.length; i++) {
  const opts = [1, 2, 3, 4, 5].map(c => String(eng[i][c] ?? '').trim())
  const filled = opts.map(o => o !== '').join(',')
  if (filled !== '1,1,1,1,0' && filled !== '1,1,1,1,1' && filled !== '1,1,1,0,0' && filled !== '1,1,0,0,0' && filled !== '1,1,1,1,0') {
    if (!/^(1,)+0*$/.test(filled)) { noncontig++; if (noncontig <= 3) console.log(`ENG #${i + 1} nekontinualno: ${filled}`) }
  }
}
console.log('ENG nekontinualnih opcija:', noncontig)

// BOS: opcije koje počinju nekim drugim slovom (npr. format razbijen)
let weirdOpt = 0
for (let i = 0; i < bos.length; i++) {
  for (let c = 1; c <= 4; c++) {
    const v = String(bos[i][c] ?? '').trim()
    if (v && !/^[a-eA-E]\)/.test(v)) { weirdOpt++; if (weirdOpt <= 5) console.log(`BOS #${i + 1} opt${c}:`, JSON.stringify(v.slice(0, 60))) }
  }
}
console.log('BOS opcija bez A-D prefiksa:', weirdOpt)
