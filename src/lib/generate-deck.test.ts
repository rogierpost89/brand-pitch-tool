import { describe, it, expect } from 'vitest'
import { buildDeck } from './generate-deck'
import type { DeckData } from './types'

const MOCK_DECK: DeckData = {
  buyer: { company: 'Albert Heijn', contact: 'Jan de Vries' },
  language: 'en',
  brands: [
    {
      name: 'La Mundial Barcelona',
      intro: 'Wine-based sparkling.',
      assets: {
        logoDataUri: 'data:image/svg+xml;base64,abc',
        heroDataUri: 'data:image/jpeg;base64,def',
        productDataUris: ['data:image/png;base64,ghi'],
        description: 'A great brand.',
      },
      products: [
        {
          id: 'clarea',
          name: 'Clarea',
          intro: 'Peach sparkling.',
          tagline: 'Escape the ordinary',
          usps: ['Fine bubbles'],
          why_it_sells: ['New category'],
          annual_volume_btl: 2400,
          image_url: '',
          imageDataUri: 'data:image/png;base64,ghi',
          prices: { deliveryPrice: '€8.50', rsp: '€17.95', margin: '28%' },
        },
      ],
    },
  ],
}

describe('buildDeck', () => {
  it('returns a self-contained HTML document', () => {
    const html = buildDeck(MOCK_DECK, 'data:image/png;base64,pdclogo')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('</html>')
    expect(html).toContain('<style>')
    expect(html).toContain('setLang')
  })

  it('includes all slide types for one brand with one product', () => {
    const html = buildDeck(MOCK_DECK, 'data:image/png;base64,pdclogo')
    expect(html).toContain('s-title')
    expect(html).toContain('s-brand-intro')
    expect(html).toContain('s-product')
    expect(html).toContain('s-pricing')
    expect(html).toContain('s-overview')
  })

  it('injects correct slide numbers', () => {
    const html = buildDeck(MOCK_DECK, 'data:image/png;base64,pdclogo')
    // 1 title + 1 brand intro + 1 product intro + 1 pricing + 1 overview = 5 slides
    expect(html).toContain('05 / 05')
  })

  it('sets lang=nl when language is nl', () => {
    const nlDeck = { ...MOCK_DECK, language: 'nl' as const }
    const html = buildDeck(nlDeck, 'data:image/png;base64,pdclogo')
    expect(html).toContain('lang="nl"')
  })

  it('sets initial language to EN by default', () => {
    const html = buildDeck(MOCK_DECK, 'data:image/png;base64,pdclogo')
    expect(html).toContain("setLang('en')")
  })
})
