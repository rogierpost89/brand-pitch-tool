import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExcel, PRICING_SHEET_NAME } from './parse-excel'

function buildWorkbook(
  rows: (string | number)[][],
  sheetName: string = PRICING_SHEET_NAME,
): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

const CANONICAL_HEADER = [
  'productId',
  'brandName',
  'deliveryPriceExcl',
  'deliveryPriceIncl',
  'rsp',
  'marginExcl',
  'marginIncl',
]

const SAMPLE_ROWS: (string | number)[][] = [
  CANONICAL_HEADER,
  ['clarea', 'La Mundial', '€7.20', '€8.50', '€17.95', '28%', '22%'],
  ['rosso', 'Roots Divino', '€8.10', '€9.50', '€19.95', '30%', '24%'],
]

describe('parseExcel', () => {
  it('parses products from a canonical Pricing sheet', () => {
    const buf = buildWorkbook(SAMPLE_ROWS)
    const rows = parseExcel(buf)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      productId: 'clarea',
      brandName: 'La Mundial',
      deliveryPriceExcl: '€7.20',
      deliveryPriceIncl: '€8.50',
      rsp: '€17.95',
      marginExcl: '28%',
      marginIncl: '22%',
    })
    expect(rows[1].productId).toBe('rosso')
  })

  it('accepts only required columns; optional columns default to empty', () => {
    const rows: (string | number)[][] = [
      ['productId', 'deliveryPriceExcl', 'rsp'],
      ['clarea', '€7.20', '€17.95'],
    ]
    const out = parseExcel(buildWorkbook(rows))
    expect(out).toEqual([
      {
        productId: 'clarea',
        brandName: '',
        deliveryPriceExcl: '€7.20',
        deliveryPriceIncl: '',
        rsp: '€17.95',
        marginExcl: '',
        marginIncl: '',
      },
    ])
  })

  it('skips rows with an empty productId', () => {
    const rows: (string | number)[][] = [
      CANONICAL_HEADER,
      ['clarea', 'La Mundial', '€7.20', '€8.50', '€17.95', '28%', '22%'],
      ['', '', '', '', '', '', ''],
      ['rosso', 'Roots Divino', '€8.10', '€9.50', '€19.95', '30%', '24%'],
    ]
    const out = parseExcel(buildWorkbook(rows))
    expect(out.map(r => r.productId)).toEqual(['clarea', 'rosso'])
  })

  it('throws when the Pricing sheet is missing', () => {
    const buf = buildWorkbook(SAMPLE_ROWS, 'SomethingElse')
    expect(() => parseExcel(buf)).toThrow(/Sheet "Pricing" not found/)
  })

  it('throws when a required column is missing, naming the missing column', () => {
    const rows: (string | number)[][] = [
      ['productId', 'deliveryPriceExcl'], // missing rsp
      ['clarea', '€7.20'],
    ]
    expect(() => parseExcel(buildWorkbook(rows))).toThrow(/Missing required column.*rsp/)
  })

  it('throws when the sheet has only a header row', () => {
    const buf = buildWorkbook([CANONICAL_HEADER])
    expect(() => parseExcel(buf)).toThrow(/empty|no data rows/)
  })
})
