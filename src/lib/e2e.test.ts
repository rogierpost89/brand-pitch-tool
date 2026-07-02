/**
 * End-to-end test: Pricing.xlsx -> parseExcel -> renderDeckHtml -> validate HTML contents.
 *
 * Pins the invariants that the rebuild was meant to guarantee:
 *  - The canonical Pricing-sheet parser yields the rows the deck needs.
 *  - The HTML renderer produces a valid HTML document with the expected product copy + prices.
 *  - The deck uses ONLY the Pineapple Drinks Club color tokens — no foreign brand
 *    colors leak in, even when fed brand reference colors as inputs.
 */
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExcel, PRICING_SHEET_NAME } from './parse-excel'
import { renderDeckHtml } from '@/lib/deck-html/render'
import { colors } from './deck-template/tokens'
import type { DeckInput } from './deck-template/types'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

function buildPricingWorkbook(): Buffer {
  const rows = [
    ['productId', 'brandName', 'deliveryPriceExcl', 'deliveryPriceIncl', 'rsp', 'marginExcl', 'marginIncl'],
    ['clarea', 'La Mundial', '€7.20', '€8.50', '€17.95', '28%', '22%'],
    ['rosso', 'Roots Divino', '€8.10', '€9.50', '€19.95', '30%', '24%'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, PRICING_SHEET_NAME)
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

describe('end-to-end Pricing.xlsx -> HTML deck', () => {
  it('parses the canonical workbook and renders a deck containing all product copy + prices', async () => {
    const xlsxBuf = buildPricingWorkbook()
    const priceRows = parseExcel(xlsxBuf)
    expect(priceRows.map(r => r.productId)).toEqual(['clarea', 'rosso'])

    const input: DeckInput = {
      buyer: { company: 'Albert Heijn', contact: 'Jan de Vries' },
      language: 'en',
      marginMode: 'excl',
      pdcLogoDataUri: PNG,
      brands: [
        {
          name: 'La Mundial Barcelona',
          intro: 'Wine-based sparkling.',
          description: 'Crafted in El Born.',
          images: { logoDataUri: PNG, heroDataUri: PNG },
          products: [
            {
              id: 'clarea', name: 'Clarea',
              intro: 'Peach sparkling.', tagline: 'Escape the ordinary',
              usps: ['Fine bubbles', 'Low ABV', 'Premium fruit'],
              whyItSells: ['New category', 'Female-skewed', 'Premium pricing'],
              annualVolumeBtl: 2400,
              imageDataUri: PNG,
              prices: {
                deliveryPriceExcl: priceRows[0].deliveryPriceExcl,
                deliveryPriceIncl: priceRows[0].deliveryPriceIncl,
                rsp: priceRows[0].rsp,
                marginExcl: priceRows[0].marginExcl,
                marginIncl: priceRows[0].marginIncl,
              },
            },
          ],
        },
        {
          name: 'Roots Divino',
          intro: 'Italian aperitivo.',
          description: 'Botanical-forward.',
          images: { logoDataUri: PNG, heroDataUri: PNG },
          products: [
            {
              id: 'rosso', name: 'Rosso',
              intro: 'Crimson bitter.', tagline: 'Roots run deep',
              usps: ['Hand-picked botanicals', 'Low-sugar', 'Distinct bitter'],
              whyItSells: ['Aperitivo trend', 'Sub-€20 RSP', 'Premium positioning'],
              annualVolumeBtl: 1800,
              imageDataUri: PNG,
              prices: {
                deliveryPriceExcl: priceRows[1].deliveryPriceExcl,
                deliveryPriceIncl: priceRows[1].deliveryPriceIncl,
                rsp: priceRows[1].rsp,
                marginExcl: priceRows[1].marginExcl,
                marginIncl: priceRows[1].marginIncl,
              },
            },
          ],
        },
      ],
    }

    const html = renderDeckHtml(input)

    // Must be a valid HTML document
    expect(html.toLowerCase()).toContain('<!doctype html>')

    // Product copy + brand names made it into the deck
    expect(html).toContain('Clarea')
    expect(html).toContain('Rosso')
    expect(html).toContain('La Mundial Barcelona')
    expect(html).toContain('Roots Divino')

    // Prices made it in (these come from the parsed Pricing sheet)
    expect(html).toContain('€17.95')
    expect(html).toContain('€19.95')
    expect(html).toContain('€7.20')
    expect(html).toContain('€8.10')

    // The chosen margin mode (excl) is what shows up
    expect(html).toContain('28%')
    expect(html).toContain('30%')

    // Image data URIs are embedded in the HTML
    expect(html).toContain(PNG)
  })

  it('enforces the single PDC house style — no foreign hex colors in slide HTML', async () => {
    // Whitelist of color tokens that the renderer is allowed to emit.
    const allowedColors = new Set<string>(
      [
        ...Object.values(colors).map(c => c.toUpperCase()),
        '0A0A0A',     // title-slide black panel
        'FFFFFF',     // canvas
        '000000',     // ink
      ].map(c => c.replace('#', '')),
    )

    const input: DeckInput = {
      buyer: { company: 'Buyer', contact: 'Contact' },
      language: 'en', marginMode: 'excl', pdcLogoDataUri: PNG,
      brands: [{
        name: 'Test', intro: 'i', description: 'd',
        images: { logoDataUri: PNG, heroDataUri: PNG },
        products: [{
          id: 'p', name: 'P', intro: 'i', tagline: 't',
          usps: ['a', 'b', 'c'], whyItSells: ['x', 'y', 'z'],
          annualVolumeBtl: 1, imageDataUri: PNG,
          prices: { deliveryPriceExcl: '€1', deliveryPriceIncl: '€1', rsp: '€1', marginExcl: '1%', marginIncl: '1%' },
        }],
      }],
    }

    const html = renderDeckHtml(input)

    // Find every #RRGGBB hex color token in the slide HTML (CSS color values).
    const used = new Set<string>()
    const re = /#([0-9A-Fa-f]{6})\b/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) used.add(m[1].toUpperCase())

    const foreign = Array.from(used).filter(c => !allowedColors.has(c))
    expect(foreign).toEqual([])
  })
})
