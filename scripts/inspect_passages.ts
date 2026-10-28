import * as XLSX from 'xlsx'

const wb = XLSX.readFile('/home/z/my-project/upload/SrednjaSkolaPitanja (1).xlsx')
const engAll = XLSX.utils.sheet_to_json(wb.Sheets['engleski jezik'], { header: 1 }) as unknown[][]
const bosAll = XLSX.utils.sheet_to_json(wb.Sheets['BosanskiJezik'], { header: 1 }) as unknown[][]
const eng = engAll.filter(r => r && r[0] && String(r[0]).trim() !== '').slice(1)
const bos = bosAll.filter(r => r && r[0] && String(r[0]).trim() !== '').slice(1)

// 1) ENG red sa QUESTION: markerom — CEO sadržaj ćelije
const qi = eng.findIndex(r => String(r[0]).includes('QUESTION:'))
console.log(`=== ENG #${qi + 1} (sa QUESTION:) CEO TEKST ===`)
console.log(JSON.stringify(String(eng[qi][0])))
console.log('opcije:', JSON.stringify([1, 2, 3, 4, 5].map(c => eng[qi][c])))
console.log('tačan:', JSON.stringify(eng[qi][6]))

// 2) ENG "Read the text" BEZ QUESTION markera — ceo tekst
const ri = eng.findIndex(r => /read\s+the\s+text/i.test(String(r[0]).slice(0, 60)) && !String(r[0]).includes('QUESTION:'))
console.log(`\n=== ENG #${ri + 1} (Read text BEZ QUESTION:) CEO TEKST ===`)
console.log(JSON.stringify(String(eng[ri][0])))
console.log('opcije:', JSON.stringify([1, 2, 3, 4, 5].map(c => eng[ri][c])))
console.log('tačan:', JSON.stringify(eng[ri][6]))

// 3) ENG "Tačan" sa tačkom formatom — koliko ih, primjeri
let dotFormat = 0, parenFormat = 0, other = 0
for (const r of eng) {
  const c = String(r[6] ?? '').trim()
  if (/^[a-eA-E]\)/.test(c)) parenFormat++
  else if (/^[a-eA-E]\./.test(c)) dotFormat++
  else other++
}
console.log(`\nENG Tačan formati: X)=${parenFormat}, X.=${dotFormat}, ostalo=${other}`)

// 4) koliko ENG redova ima QUESTION: vs Read-prefix vs ostalo
let qm = 0, rp = 0, plain = 0
for (const r of eng) {
  const q = String(r[0])
  if (q.includes('QUESTION:')) qm++
  else if (/read\s+the\s+text/i.test(q.slice(0, 60))) rp++
  else plain++
}
console.log(`ENG: QUESTION=${qm}, ReadPrefix bez marker=${rp}, obična=${plain}`)

// 5) BOS #160 kompletan red
console.log('\n=== BOS #160 KOMPLETAN RED ===')
console.log(JSON.stringify(bos[159], null, 1))

// 6) BOS koliko pitanja ima "Pročitaj sljedeći odlomak" (passage u istoj ćeliji)
let bosPass = 0
for (const r of bos) if (/Pročitaj sljedeći/i.test(String(r[0]).slice(0, 60))) bosPass++
console.log('\nBOS sa "Pročitaj sljedeći" početkom:', bosPass)

// 7) provjera praznih opcija usred reda (npr. a puno, b prazno, c puno)
let gaps = 0
for (const r of eng) {
  const opts = [1, 2, 3, 4, 5].map(c => String(r[c] ?? '').trim())
  const firstEmpty = opts.findIndex(o => o === '')
  if (firstEmpty !== -1 && opts.slice(firstEmpty).some(o => o !== '')) { gaps++; if (gaps <= 5) console.log(`ENG gap: #${eng.indexOf(r) + 1}: ${JSON.stringify(opts.map(o => o.slice(0, 20)))}`) }
}
console.log('ENG redova sa prazninom usred opcija:', gaps)

// 8) broj stvarno različitih passage blokova (iste prvih 200 znakova)
const passSet = new Map<string, number>()
for (const r of eng) {
  const q = String(r[0])
  if (q.includes('QUESTION:') || /read\s+the\s+text/i.test(q.slice(0, 60))) {
    const key = q.slice(0, 200).replace(/\s+/g, ' ')
    passSet.set(key, (passSet.get(key) ?? 0) + 1)
  }
}
console.log('ENG različitih passage blokova:', passSet.size)
