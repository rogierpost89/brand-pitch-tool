import * as XLSX from 'xlsx'
import type { PriceRow } from './types'

const ROW_LABELS: Record<keyof Omit<PriceRow, 'productId'> | 'productId', string> = {
  brandName: 'Brand Name',
  productId: 'Product / SKU',
  deliveryPrice: 'Direct Delivery Price to retailer (incl.excise)',
  rsp: 'CONSUMER RSP (incl.excise + VAT)',
  margin: 'Off-trade retail margin %',
}

function findSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  // Try each sheet until we find one containing the required row labels
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][]
    const col0 = rows.map(r => String(r[0] ?? '').toLowerCase())
    const hasAll = Object.values(ROW_LABELS).every(label =>
      col0.some(cell => cell.includes(label.toLowerCase()))
    )
    if (hasAll) return sheet
  }
  // Fall back to first sheet and let the missing-row error surface
  return workbook.Sheets[workbook.SheetNames[0]]
}

export function parseExcel(buffer: Buffer): PriceRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = findSheet(workbook)
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][]

  const labelRowIndex: Partial<Record<keyof typeof ROW_LABELS, number>> = {}

  rows.forEach((row, i) => {
    const cellA = String(row[0] ?? '').trim().toLowerCase()
    if (!cellA) return
    for (const [key, label] of Object.entries(ROW_LABELS)) {
      if (cellA.includes(label.toLowerCase())) {
        labelRowIndex[key as keyof typeof ROW_LABELS] = i
      }
    }
  })

  const missing = Object.keys(ROW_LABELS).filter(
    k => labelRowIndex[k as keyof typeof ROW_LABELS] === undefined
  )
  if (missing.length > 0) {
    throw new Error(`Missing rows in Excel: ${missing.join(', ')}`)
  }

  const productIdRow = rows[labelRowIndex.productId!]
  const results: PriceRow[] = []

  for (let col = 1; col < productIdRow.length; col++) {
    const productId = String(productIdRow[col] ?? '').trim()
    if (!productId) continue

    results.push({
      productId,
      brandName: String(rows[labelRowIndex.brandName!]?.[col] ?? '').trim(),
      deliveryPrice: String(rows[labelRowIndex.deliveryPrice!]?.[col] ?? '').trim(),
      rsp: String(rows[labelRowIndex.rsp!]?.[col] ?? '').trim(),
      margin: String(rows[labelRowIndex.margin!]?.[col] ?? '').trim(),
    })
  }

  return results
}
