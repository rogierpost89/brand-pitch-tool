import * as XLSX from 'xlsx'
import type { PriceRow } from './types'

export const PRICING_SHEET_NAME = 'Pricing'

// Canonical column headers. Header row MUST be row 1 of the Pricing sheet.
// Optional columns may be omitted but must use these exact names if present.
export const REQUIRED_COLUMNS = [
  'productId',
  'deliveryPriceExcl',
  'rsp',
] as const

export const OPTIONAL_COLUMNS = [
  'brandName',
  'deliveryPriceIncl',
  'marginExcl',
  'marginIncl',
] as const

const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const
type ColumnName = (typeof ALL_COLUMNS)[number]

function cell(row: (string | number)[], idx: number | undefined): string {
  if (idx === undefined) return ''
  const v = row[idx]
  if (v === undefined || v === null) return ''
  return String(v).trim()
}

/**
 * Parse an .xlsx workbook using a fixed schema.
 *
 * Contract:
 *  - Workbook MUST contain a sheet named "Pricing".
 *  - Row 1 of that sheet MUST be a header row using the exact column names
 *    defined in REQUIRED_COLUMNS / OPTIONAL_COLUMNS.
 *  - Rows 2..n are data rows, one product per row.
 *  - Rows whose productId is blank are skipped.
 *
 * No heuristics. Any deviation throws a clear, column-level error.
 */
export function parseExcel(buffer: Buffer): PriceRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  const sheet = workbook.Sheets[PRICING_SHEET_NAME]
  if (!sheet) {
    throw new Error(
      `Sheet "${PRICING_SHEET_NAME}" not found. Found sheets: [${workbook.SheetNames.join(', ')}]. ` +
        `Use data/value-chain-template.xlsx as the canonical structure.`,
    )
  }

  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    blankrows: false,
  }) as (string | number)[][]

  if (rows.length < 2) {
    throw new Error(`Sheet "${PRICING_SHEET_NAME}" is empty. Expected a header row plus at least one product row.`)
  }

  const header = rows[0].map(c => String(c ?? '').trim())
  const colIndex: Partial<Record<ColumnName, number>> = {}
  for (const name of ALL_COLUMNS) {
    const idx = header.indexOf(name)
    if (idx >= 0) colIndex[name] = idx
  }

  const missing = REQUIRED_COLUMNS.filter(c => colIndex[c] === undefined)
  if (missing.length > 0) {
    throw new Error(
      `Missing required column(s) in sheet "${PRICING_SHEET_NAME}": [${missing.join(', ')}]. ` +
        `Header row found: [${header.join(' | ')}]. Required: [${REQUIRED_COLUMNS.join(', ')}].`,
    )
  }

  const out: PriceRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const productId = cell(row, colIndex.productId)
    if (!productId) continue
    out.push({
      productId,
      brandName: cell(row, colIndex.brandName),
      deliveryPriceExcl: cell(row, colIndex.deliveryPriceExcl),
      deliveryPriceIncl: cell(row, colIndex.deliveryPriceIncl),
      rsp: cell(row, colIndex.rsp),
      marginExcl: cell(row, colIndex.marginExcl),
      marginIncl: cell(row, colIndex.marginIncl),
    })
  }

  if (out.length === 0) {
    throw new Error(`Sheet "${PRICING_SHEET_NAME}" has no data rows (productId column is empty).`)
  }

  return out
}
