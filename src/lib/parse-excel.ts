import * as XLSX from 'xlsx'
import type { PriceRow } from './types'

// Flexible keyword matchers — order matters (most specific first)
const MATCHERS: Array<{ key: keyof PriceRow; test: (cell: string) => boolean }> = [
  { key: 'deliveryPrice', test: c => c.includes('delivery') && c.includes('price') },
  { key: 'deliveryPrice', test: c => c.includes('direct') && c.includes('price') },
  { key: 'rsp',           test: c => c.includes('rsp') },
  { key: 'rsp',           test: c => c.includes('consumer') && (c.includes('price') || c.includes('retail')) },
  { key: 'margin',        test: c => c.includes('margin') },
  { key: 'productId',     test: c => c.includes('product') || c.includes('sku') },
  { key: 'brandName',     test: c => c.includes('brand') && c.includes('name') },
  { key: 'brandName',     test: c => c === 'brand' },
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

  const required: Array<keyof PriceRow> = ['productId', 'deliveryPrice', 'rsp', 'margin']
  if (required.some(k => labelRowIndex[k] === undefined)) return null

  const productIdRow = rows[labelRowIndex.productId!]
  const results: PriceRow[] = []

  for (let col = 1; col < productIdRow.length; col++) {
    const productId = String(productIdRow[col] ?? '').trim()
    if (!productId) continue

    results.push({
      productId,
      brandName: labelRowIndex.brandName !== undefined
        ? String(rows[labelRowIndex.brandName]?.[col] ?? '').trim()
        : '',
      deliveryPrice: String(rows[labelRowIndex.deliveryPrice!]?.[col] ?? '').trim(),
      rsp:           String(rows[labelRowIndex.rsp!]?.[col] ?? '').trim(),
      margin:        String(rows[labelRowIndex.margin!]?.[col] ?? '').trim(),
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

  const required: Array<keyof PriceRow> = ['productId', 'deliveryPrice', 'rsp', 'margin']
  if (required.some(k => colIndex[k] === undefined)) return null

  const results: PriceRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const productId = String(row[colIndex.productId!] ?? '').trim()
    if (!productId) continue
    results.push({
      productId,
      brandName:     colIndex.brandName !== undefined ? String(row[colIndex.brandName] ?? '').trim() : '',
      deliveryPrice: String(row[colIndex.deliveryPrice!] ?? '').trim(),
      rsp:           String(row[colIndex.rsp!] ?? '').trim(),
      margin:        String(row[colIndex.margin!] ?? '').trim(),
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
    `Need columns/rows labelled with: product/SKU, delivery price, RSP, margin.`
  )
}
