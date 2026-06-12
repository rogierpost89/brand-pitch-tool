import * as XLSX from 'xlsx'
import type { PriceRow } from './types'

// Flexible keyword matchers — order matters (most specific first)
const MATCHERS: Array<{ key: keyof PriceRow; test: (cell: string) => boolean }> = [
  // Excl. excise price — must check before generic price matchers
  { key: 'deliveryPriceExcl', test: c => (c.includes('excl') || c.includes('ex ') || c.includes('ex.') || c.includes('netto')) && (c.includes('price') || c.includes('prijs') || c.includes('delivery') || c.includes('buying') || c.includes('purchase') || c.includes('levering')) },
  // Incl. excise price
  { key: 'deliveryPriceIncl', test: c => (c.includes('incl') || c.includes('inc ') || c.includes('brutto')) && (c.includes('price') || c.includes('prijs') || c.includes('delivery') || c.includes('buying') || c.includes('purchase') || c.includes('levering')) },
  // Margin excl. excise — check before generic margin
  { key: 'marginExcl',        test: c => (c.includes('margin') || c.includes('marge')) && (c.includes('excl') || c.includes('ex ') || c.includes('ex.')) },
  // Margin incl. excise
  { key: 'marginIncl',        test: c => (c.includes('margin') || c.includes('marge')) && (c.includes('incl') || c.includes('inc ')) },
  // RSP
  { key: 'rsp',               test: c => c.includes('rsp') },
  { key: 'rsp',               test: c => c.includes('consumer') && (c.includes('price') || c.includes('retail')) },
  // Fallbacks: unqualified "delivery price" treated as excl. (old-style single-price Excels)
  { key: 'deliveryPriceExcl', test: c => (c.includes('delivery') || c.includes('direct') || c.includes('buying')) && c.includes('price') },
  { key: 'productId',         test: c => c.includes('product') || c.includes('sku') },
  { key: 'brandName',         test: c => c.includes('brand') && c.includes('name') },
  { key: 'brandName',         test: c => c === 'brand' },
]

function matchLabel(cell: string): keyof PriceRow | null {
  const lower = cell.trim().toLowerCase()
  if (!lower) return null
  for (const m of MATCHERS) {
    if (m.test(lower)) return m.key
  }
  return null
}

/** Try transposed layout: labels in column A, products in columns B, C, … */
function tryTransposedLayout(rows: (string | number)[][]): PriceRow[] | null {
  const labelRowIndex: Partial<Record<keyof PriceRow, number>> = {}

  rows.forEach((row, i) => {
    // Check first 3 columns for the label (handles indented layouts)
    for (let c = 0; c < 3; c++) {
      const cell = String(row[c] ?? '').trim()
      if (!cell) continue
      const key = matchLabel(cell)
      if (key && labelRowIndex[key] === undefined) {
        labelRowIndex[key] = i
        break
      }
    }
  })

  const required: Array<keyof PriceRow> = ['productId', 'deliveryPriceExcl', 'rsp']
  if (required.some(k => labelRowIndex[k] === undefined)) return null

  const productIdRow = rows[labelRowIndex.productId!]
  const results: PriceRow[] = []

  for (let col = 1; col < productIdRow.length; col++) {
    const productId = String(productIdRow[col] ?? '').trim()
    if (!productId) continue

    results.push({
      productId,
      brandName:        labelRowIndex.brandName !== undefined ? String(rows[labelRowIndex.brandName]?.[col] ?? '').trim() : '',
      deliveryPriceExcl: String(rows[labelRowIndex.deliveryPriceExcl!]?.[col] ?? '').trim(),
      deliveryPriceIncl: labelRowIndex.deliveryPriceIncl !== undefined ? String(rows[labelRowIndex.deliveryPriceIncl]?.[col] ?? '').trim() : '',
      rsp:               String(rows[labelRowIndex.rsp!]?.[col] ?? '').trim(),
      marginExcl:        labelRowIndex.marginExcl !== undefined ? String(rows[labelRowIndex.marginExcl]?.[col] ?? '').trim() : '',
      marginIncl:        labelRowIndex.marginIncl !== undefined ? String(rows[labelRowIndex.marginIncl]?.[col] ?? '').trim() : '',
    })
  }

  return results.length > 0 ? results : null
}

/** Try tabular layout: headers in row 1, products in rows 2+ */
function tryTabularLayout(rows: (string | number)[][]): PriceRow[] | null {
  if (rows.length < 2) return null

  const headerRow = rows[0]
  const colIndex: Partial<Record<keyof PriceRow, number>> = {}

  headerRow.forEach((cell, c) => {
    const key = matchLabel(String(cell ?? ''))
    if (key && colIndex[key] === undefined) colIndex[key] = c
  })

  const required: Array<keyof PriceRow> = ['productId', 'deliveryPriceExcl', 'rsp']
  if (required.some(k => colIndex[k] === undefined)) return null

  const results: PriceRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const productId = String(row[colIndex.productId!] ?? '').trim()
    if (!productId) continue
    results.push({
      productId,
      brandName:         colIndex.brandName !== undefined ? String(row[colIndex.brandName] ?? '').trim() : '',
      deliveryPriceExcl: String(row[colIndex.deliveryPriceExcl!] ?? '').trim(),
      deliveryPriceIncl: colIndex.deliveryPriceIncl !== undefined ? String(row[colIndex.deliveryPriceIncl] ?? '').trim() : '',
      rsp:               String(row[colIndex.rsp!] ?? '').trim(),
      marginExcl:        colIndex.marginExcl !== undefined ? String(row[colIndex.marginExcl] ?? '').trim() : '',
      marginIncl:        colIndex.marginIncl !== undefined ? String(row[colIndex.marginIncl] ?? '').trim() : '',
    })
  }

  return results.length > 0 ? results : null
}

export function parseExcel(buffer: Buffer): PriceRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  const errors: string[] = []

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][]
    if (rows.length === 0) continue

    const result = tryTransposedLayout(rows) ?? tryTabularLayout(rows)
    if (result) return result

    // Collect first-column values for error reporting
    const labels = rows.slice(0, 20).map(r => String(r[0] ?? '').trim()).filter(Boolean)
    errors.push(`Tab "${name}": found labels [${labels.slice(0, 8).join(', ')}]`)
  }

  throw new Error(
    `Could not find pricing data in any tab. ${errors.join(' | ')}. ` +
    `Need columns/rows labelled with: product/SKU, delivery price excl. excise, RSP. ` +
    `Optionally: delivery price incl. excise, margin excl., margin incl.`
  )
}
