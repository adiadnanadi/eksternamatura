import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'

function norm(s: string): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 90)
}

// stari Excel (osnovna skola)
const oldWb = XLSX.readFile('/home/z/my-project/upload/osnovnaSkolaPitanja.xlsx')
const oldBos = XLSX.utils.sheet_to_json(oldWb.Sheets['BosanskiJezik'], { header: 1 }) as string[][]
const oldEng = XLSX.utils.sheet_to_json(oldWb.Sheets['engleski jezik'], { header: 1 }) as string[][]

// novi Excel (srednja skola)
const newWb = XLSX.readFile('/home/z/my-project/upload/SrednjaSkolaPitanja (1).xlsx')
const newBos = XLSX.utils.sheet_to_json(newWb.Sheets['BosanskiJezik'], { header: 1 }) as string[][]
const newEng = XLSX.utils.sheet_to_json(newWb.Sheets['engleski jezik'], { header: 1 }) as string[][]

function dataRows(rows: string[][], qCol = 0): string[][] {
  return rows.filter(r => r && r[qCol] && String(r[qCol]).trim() !== '').slice(1)
}

function countOpts(r: string[], opts: number[]): number {
  let n = 0
  for (const i of opts) if (r[i] && String(r[i]).trim() !== '') n++
  return n
}

for (const [label, oldRows, newRows, opts] of [
  ['BOSANSKI', oldBos, newBos, [1, 2, 3, 4]],
  ['ENGLESKI', oldEng, newEng, [1, 2, 3, 4, 5]],
] as [string, string[][], string[][], number[]][]) {
  const o = dataRows(oldRows)
  const n = dataRows(newRows)
  const oSet = new Set(o.map(r => norm(r[0])))
  const nSet = new Set(n.map(r => norm(r[0])))
  let overlap = 0
  for (const q of oSet) if (nSet.has(q)) overlap++
  const optCounts = new Map<number, number>()
  for (const r of n) {
    const c = countOpts(r, opts)
    optCounts.set(c, (optCounts.get(c) ?? 0) + 1)
  }
  console.log(`${label}: starih=${o.length}, novih=${n.length}, preklapanje=${overlap}`)
  console.log(`  broj opcija u novim: ${JSON.stringify([...optCounts.entries()].sort())}`)
}

// potpuna statistika BOS-STAT i ENG-STAT
for (const [name, wb] of [['BOS-STAT', newWb], ['ENG-STAT', newWb]] as [string, XLSX.WorkBook][]) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 }) as (string | number)[][]
  console.log(`\n=== ${name} ===`)
  for (const r of rows.slice(0, 8)) {
    const line = (r ?? []).map(c => (c === null || c === undefined ? '' : String(c).trim())).filter(c => c !== '')
    if (line.length) console.log(' ', line.join(' | '))
  }
}

// pogled na kraj BosanskiJezik i engleski sheetova (možda passage pitanja)
const bosData = dataRows(newBos)
const engData = dataRows(newEng)
console.log('\nZadnji BOS red:', JSON.stringify(bosData[bosData.length - 1]).slice(0, 200))
console.log('Zadnji ENG red:', JSON.stringify(engData[engData.length - 1]).slice(0, 200))

// provjera koliko ENG pitanja sadrži "QUESTION:" marker (passage) ili duge tekstove
let withMarker = 0, long = 0
for (const r of engData) {
  if (String(r[0]).includes('QUESTION:')) withMarker++
  if (String(r[0]).length > 400) long++
}
console.log(`ENG: sa QUESTION markerom=${withMarker}, dužih od 400 znakova=${long}`)

// usporedba starog engleskog (75) — da li su novi podaci nadskup?
const oldEngData = dataRows(oldEng)
const newEngSet = new Set(engData.map(r => norm(r[0])))
const oldInNew = oldEngData.filter(r => newEngSet.has(norm(r[0]))).length
console.log(`ENG: starih ${oldEngData.length}, njih u novim: ${oldInNew}`)

const oldBosData = dataRows(oldBos)
const newBosSet = new Set(bosData.map(r => norm(r[0])))
const oldBosInNew = oldBosData.filter(r => newBosSet.has(norm(r[0]))).length
console.log(`BOS: starih ${oldBosData.length}, njih u novim: ${oldBosInNew}`)

// provjeri postojece banke u data/ (sada su tu i stare)
const oldBosJson = JSON.parse(readFileSync('/home/z/my-project/data/bosanski.json', 'utf-8'))
console.log('\ndata/bosanski.json pitanja:', oldBosJson.length ?? oldBosJson.questions?.length)
