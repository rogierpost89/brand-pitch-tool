import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExcel } from './parse-excel'

function buildWorkbook(rows: (string | number)[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

const SAMPLE_ROWS = [
  ['Brand Name', 'La Mundial', 'Roots Divino'],
  ['Product / SKU', 'clarea', 'rosso'],
  ['Direct Delivery Price to retailer (incl.excise)', '€8.50', '€9.50'],
  ['CONSUMER RSP (incl.excise + VAT)', '€17.95', '€19.95'],
  ['Off-trade retail margin %', '28%', '30%'],
]

describe('parseExcel', () => {
  it('parses two products from sample workbook', () => {
    const buf = buildWorkbook(SAMPLE_ROWS)
    const rows = parseExcel(buf)
    expect(rows).toHaveLength(2)
    expect(rows[0].productId).toBe('clarea')
    expect(rows[0].deliveryPrice).toBe('€8.50')
    expect(rows[0].rsp).toBe('€17.95')
    expect(rows[0].margin).toBe('28%')
    expect(rows[1].productId).toBe('rosso')
    expect(rows[1].brandName).toBe('Roots Divino')
  })

  it('throws when a required row label is missing', () => {
    const incompleteRows = SAMPLE_ROWS.slice(0, 3) // missing RSP and margin rows
    const buf = buildWorkbook(incompleteRows)
    expect(() => parseExcel(buf)).toThrow('Could not find pricing data')
  })

  it('skips empty product columns', () => {
    const rowsWithEmpty = [
      ['Brand Name', 'La Mundial', '', 'Roots Divino'],
      ['Product / SKU', 'clarea', '', 'rosso'],
      ['Direct Delivery Price to retailer (incl.excise)', '€8.50', '', '€9.50'],
      ['CONSUMER RSP (incl.excise + VAT)', '€17.95', '', '€19.95'],
      ['Off-trade retail margin %', '28%', '', '30%'],
    ]
    const buf = buildWorkbook(rowsWithEmpty)
    const rows = parseExcel(buf)
    expect(rows).toHaveLength(2)
  })
})
