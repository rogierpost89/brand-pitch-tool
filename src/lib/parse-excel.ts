import * as XLSX from 'xlsx'
import type { PriceRow } from './types'

// Flexible keyword matchers — order matters (most specific first)
const MATCHERS: Array<{ key: keyof PriceRow; test: (cell: string) => boolean }> = [
  // Excl. excise price — must check before generic price matchers
  { key: 'deliveryPriceExcl', test: c => (c.includes('excl') || c.includes('ex ') || c.includes('ex.') || c.includes('netto') || c.includes('nsv')) && (c.includes('price') || c.includes('prijs') || c.includes('delivery') || c.includes('buying') || c.includes('purchase') || c.includes('levering') || c.includes('sell') || c.includes('nsv')) },
  // Incl. excise price
  { key: 'deliveryPriceIncl', test: c => (c.includes('incl') || c.includes('inc ') || c.includes('brutto') || c.includes('wholesale') || c.includes('groothandel')) && (c.includes('price') || c.includes('prijs') || c.includes('delivery') || c.includes('buying') || c.includes('purchase') || c.includes('levering') || c.includes('wholesale') || c.includes('groothandel')) },
  // Margin excl. excise — check before generic margin
  { key: 'marginExcl',        test: c => (c.includes('margin') || c.includes('marge') || /^m[\s.]*ex/.test(c)) && (c.includes('excl') || c.includes('ex') || /^m[\s.]*ex/.test(c)) },
  // Margin incl. excise
  { key: 'marginIncl',        test: c => (c.includes('margin') || c.includes('marge') || /^m[\s.]*in/.test(c)) && (c.includes('incl') || c.includes('inc') || /^m[\s.]*in/.test(c)) },
  // RSP
  { key: 'rsp',               test: c => c.includes('rsp') || (c.includes('consumer') && (c.includes('price') || c.includes('retail') || c.includes('prijs'))) },
  // Fallback: unqualified "delivery price" treated as excl.
  { key: 'deliveryPriceExcl', test: c => (c.includes('delivery') || c.includes('direct') || c.includes('buying')) && c.includes('price') },
  { key: 'productId',         test: c => c.includes('product') || c.includes('sku') || c.includes('item') || c.includes('artikel') },
  { key: 'brandName',         test: c => (c.includes('brand') && c.includes('name')) || c === 'brand' || c === 'merk' },
]

function matchLabel(cell: string): keyof PriceRow | null {
  const lower = cell.trim().toLowerCase()
  if (!lower) return null
  for (const m of MATCHERS) {
    if (m.test(lower)) return m.key
  }
  return null
}

/**
 * Try tabular layout: one header row, products below it.
 * Scans the first MAX_HEADER_SCAN rows to find the header (handles title rows above).
 */
function tryTabularLayout(rows: (string | number)[][]): PriceRow[] | null {
  const MAX_HEADER_SCAN = 50

  for (let headerIdx = 0; headerIdx < Math.min(MAX_HEADER_SCAN, rows.length - 1); headerIdx++) {
    const headerRow = rows[headerIdx]
    const colIndex: Partial<Record<keyof PriceRow, number>> = {}

    headerRow.forEach((cell, c) => {
      const key = matchLabel(String(cell ?? ''))
      if (key && colIndex[key] === undefined) colIndex[key] = c
    })

    const required: Array<keyof PriceRow> = ['productId', 'deliveryPriceExcl', 'rsp']
    if (required.some(k => colIndex[k] === undefined)) continue

    const results: PriceRow[] = []
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r]
      const productId = String(row[colIndex.productId!] ?? '').trim()
      // Skip empty rows or rows that look like sub-headers (productId matches a known label)
      if (!productId || matchLabel(productId) !== null) continue
      results.push({
        productId,
        brandName:         colIndex.brandName         !== undefined ? String(row[colIndex.brandName]         ?? '').trim() : '',
        deliveryPriceExcl: String(row[colIndex.deliveryPriceExcl!] ?? '').trim(),
        deliveryPriceIncl: colIndex.deliveryPriceIncl !== undefined ? String(row[colIndex.deliveryPriceIncl] ?? '').trim() : '',
        rsp:               String(row[colIndex.rsp!]              ?? '').trim(),
        marginExcl:        colIndex.marginExcl        !== undefined ? String(row[colIndex.marginExcl]        ?? '').trim() : '',
        marginIncl:        colIndex.marginIncl        !== undefined ? String(row[colIndex.marginIncl]        ?? '').trim() : '',
      })
    }

    if (results.length > 0) return results
  }

  return null
}

/** Try transposed layout: labels in column A, products in columns B, C, … */
function tryTransposedLayout(rows: (string | number)[][]): PriceRow[] | null {
  const labelRowIndex: Partial<Record<keyof PriceRow, number>> = {}

  rows.forEach((row, i) => {
    for (let c = 0; c < 5; c++) {
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
    // Skip empty or header-like values
    if (!productId || matchLabel(productId) !== null) continue

    results.push({
      productId,
      brandName:         labelRowIndex.brandName         !== undefined ? String(rows[labelRowIndex.brandName]?.[col]         ?? '').trim() : '',
      deliveryPriceExcl: String(rows[labelRowIndex.deliveryPriceExcl!]?.[col] ?? '').trim(),
      deliveryPriceIncl: labelRowIndex.deliveryPriceIncl !== undefined ? String(rows[labelRowIndex.deliveryPriceIncl]?.[col] ?? '').trim() : '',
      rsp:               String(rows[labelRowIndex.rsp!]?.[col]               ?? '').trim(),
      marginExcl:        labelRowIndex.marginExcl        !== undefined ? String(rows[labelRowIndex.marginExcl]?.[col]        ?? '').trim() : '',
      marginIncl:        labelRowIndex.marginIncl        !== undefined ? String(rows[labelRowIndex.marginIncl]?.[col]        ?? '').trim() : '',
    })
  }

  return results.length > 0 ? results : null
}

export function parseExcel(buffer: Buffer): PriceRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  // Try every tab, collect the result with the most rows (avoids picking a small summary tab)
  let best: PriceRow[] = []
  const errors: string[] = []

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][]
    if (rows.length === 0) continue

    // Tabular first (most common), then transposed as fallback
    const result = tryTabularLayout(rows) ?? tryTransposedLayout(rows)

    if (result && result.length > best.length) {
      best = result
    }

    if (!result) {
      // Show col-A values from first 20 rows for context
      const colAValues = rows.slice(0, 20).map(r => String(r[0] ?? '').trim()).filter(Boolean)
      // Show which matcher keys were found and at which rows (tabular scan up to 50 rows, all cols)
      const foundLabels: string[] = []
      for (let ri = 0; ri < Math.min(50, rows.length); ri++) {
        for (let ci = 0; ci < rows[ri].length; ci++) {
          const key = matchLabel(String(rows[ri][ci] ?? ''))
          if (key) foundLabels.push(`${key}@r${ri}c${ci}`)
        }
      }
      const foundSummary = foundLabels.length > 0 ? `; found: [${foundLabels.slice(0, 10).join(', ')}]` : '; no matching labels found'
      errors.push(`Tab "${name}": colA=[${colAValues.slice(0, 6).join(', ')}]${foundSummary}`)
    }
  }

  if (best.length > 0) return best

  throw new Error(
    `Could not find pricing data in any tab. ${errors.join(' | ')}. ` +
    `Need columns/rows labelled with: product/SKU/item, delivery price excl. excise, RSP/consumer price. ` +
    `Optionally: delivery price incl. excise, margin excl./incl.`
  )
}
