import { describe, it, expect } from 'vitest'
import { composeDeck } from './index'
import type { DeckInput } from '@/lib/deck-template/types'

const PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const SAMPLE: DeckInput = {
  buyer: { company: 'Albert Heijn', contact: 'Jan de Vries' },
  language: 'en',
  marginMode: 'excl',
  pdcLogoDataUri: PNG_DATA_URI,
  brands: [
    {
      name: 'La Mundial Barcelona',
      intro: 'Wine-based sparkling, naturally low ABV.',
      description: 'Crafted in the El Born district of Barcelona.',
      images: { logoDataUri: PNG_DATA_URI, heroDataUri: PNG_DATA_URI },
      products: [
        {
          id: 'clarea',
          name: 'Clarea',
          intro: 'Peach sparkling.',
          tagline: 'Escape the ordinary',
          usps: ['Fine bubbles', 'Low ABV 5.5%', 'Premium fruit aromas'],
          whyItSells: ['New category', 'Female-skewed', 'Premium pricing'],
          annualVolumeBtl: 2400,
          imageDataUri: PNG_DATA_URI,
          prices: {
            deliveryPriceExcl: '€7.20',
            deliveryPriceIncl: '€8.50',
            rsp: '€17.95',
            marginExcl: '28%',
            marginIncl: '22%',
          },
        },
      ],
    },
  ],
}

describe('composeDeck', () => {
  it('produces a non-empty PPTX buffer with the .pptx (zip) signature', async () => {
    const buf = await composeDeck(SAMPLE)
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(1000)
    // PPTX files are ZIP archives — first two bytes are 'PK'
    expect(buf[0]).toBe(0x50)
    expect(buf[1]).toBe(0x4b)
  })

  it('handles missing image URIs without throwing', async () => {
    const buf = await composeDeck({
      ...SAMPLE,
      brands: [
        {
          ...SAMPLE.brands[0],
          images: { logoDataUri: '', heroDataUri: '' },
          products: [{ ...SAMPLE.brands[0].products[0], imageDataUri: '' }],
        },
      ],
    })
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('handles NL language + incl. margin mode', async () => {
    const buf = await composeDeck({ ...SAMPLE, language: 'nl', marginMode: 'incl' })
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('handles multiple brands with multiple products', async () => {
    const buf = await composeDeck({
      ...SAMPLE,
      brands: [
        SAMPLE.brands[0],
        {
          ...SAMPLE.brands[0],
          name: 'Roots Divino',
          products: [
            { ...SAMPLE.brands[0].products[0], id: 'rosso', name: 'Rosso' },
            { ...SAMPLE.brands[0].products[0], id: 'bianco', name: 'Bianco' },
          ],
        },
      ],
    })
    expect(buf.length).toBeGreaterThan(1000)
  })
})
