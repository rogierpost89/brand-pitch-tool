/**
 * Generates data/value-chain-template.xlsx — the canonical Pricing workbook.
 *
 * Run:  pnpm tsx scripts/build-value-chain-template.ts
 * (or:  npx tsx scripts/build-value-chain-template.ts)
 *
 * The header names below MUST match REQUIRED_COLUMNS / OPTIONAL_COLUMNS in
 * src/lib/parse-excel.ts. Editing one without the other will break the parser.
 */
import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const HEADER = [
  'productId',
  'brandName',
  'deliveryPriceExcl',
  'deliveryPriceIncl',
  'rsp',
  'marginExcl',
  'marginIncl',
]

const EXAMPLE_ROWS: (string | number)[][] = [
  HEADER,
  ['clarea', 'La Mundial', '€7.20', '€8.50', '€17.95', '28%', '22%'],
  ['rosso', 'Roots Divino', '€8.10', '€9.50', '€19.95', '30%', '24%'],
]

const ws = XLSX.utils.aoa_to_sheet(EXAMPLE_ROWS)
ws['!cols'] = HEADER.map(h => ({ wch: Math.max(h.length, 18) }))

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Pricing')

const out = resolve(process.cwd(), 'data/value-chain-template.xlsx')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
console.log(`Wrote ${out}`)
