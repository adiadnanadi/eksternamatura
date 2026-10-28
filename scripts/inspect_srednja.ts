import * as XLSX from 'xlsx'

const wb = XLSX.readFile('/home/z/my-project/upload/SrednjaSkolaPitanja (1).xlsx')
console.log('Sheets:', JSON.stringify(wb.SheetNames))
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name]
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][]
  const nonEmpty = rows.filter(r => r && r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
  console.log(`--- ${name}: redova ukupno=${rows.length}, nepraznih=${nonEmpty.length}`)
  console.log('  header:', JSON.stringify(rows[0]))
  if (rows[1]) console.log('  red 1:', JSON.stringify(rows[1]).slice(0, 300))
  if (rows[2]) console.log('  red 2:', JSON.stringify(rows[2]).slice(0, 200))
}
