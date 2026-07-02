import { describe, it, expect } from 'vitest'
import { renderDeckHtml } from './render'
import type { DeckInput } from '@/lib/deck-template/types'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const SAMPLE: DeckInput = {
  buyer: { company: 'Albert Heijn', contact: 'Jan de Vries' },
  language: 'en',
  marginMode: 'excl',
  pdcLogoDataUri: PNG,
  brands: [
    {
      name: 'La Mundial Barcelona',
      intro: 'Wine-based sparkling, naturally low ABV.',
      description: 'Crafted in the El Born district of Barcelona.',
      images: { logoDataUri: PNG, heroDataUri: PNG },
      products: [
        {
          id: 'p1', name: 'Rosado Spritz', intro: 'Bright and dry.',
          tagline: 'Sunset in a bottle', usps: ['Low ABV', 'Vegan', 'No added sugar'],
          whyItSells: ['On-trend', 'Repeat buyers', 'Great margin'],
          annualVolumeBtl: 12000, imageDataUri: PNG,
          prices: { deliveryPriceExcl: '€3.10', deliveryPriceIncl: '€4.20', rsp: '€7.99', marginExcl: '61%', marginIncl: '47%' },
        },
      ],
    },
  ],
}

describe('renderDeckHtml', () => {
  it('renders one slide section per expected slide', () => {
    const html = renderDeckHtml(SAMPLE)
    // 2 (title + brand intro) + 2 (product intro + pricing) + 1 overview = 5
    const count = (html.match(/class="slide"/g) ?? []).length
    expect(count).toBe(5)
  })

  it('is a complete document with the PDC yellow and embedded images', () => {
    const html = renderDeckHtml(SAMPLE)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('#F8D418')
    expect(html).toContain(PNG)
  })

  it('includes brand, product, and price copy', () => {
    const html = renderDeckHtml(SAMPLE)
    expect(html).toContain('La Mundial Barcelona')
    expect(html).toContain('Rosado Spritz')
    expect(html).toContain('€7.99')
    expect(html).toContain('Sunset in a bottle')
  })

  it('escapes HTML-special characters in copy', () => {
    const evil = { ...SAMPLE, buyer: { company: 'A & B <Ltd>', contact: 'x' } }
    const html = renderDeckHtml(evil)
    expect(html).toContain('A &amp; B &lt;Ltd&gt;')
  })
})
