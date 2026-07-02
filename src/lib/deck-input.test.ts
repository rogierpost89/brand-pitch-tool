import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/image-embed', () => ({
  imageToDataUri: vi.fn(async (url: string) => (url ? `data:image/png;base64,${btoa(url)}` : '')),
}))

import { buildDeckInput } from './deck-input'

describe('buildDeckInput', () => {
  it('maps request body into a DeckInput with fetched image data URIs', async () => {
    const input = await buildDeckInput({
      deckData: {
        buyer: { company: 'AH', contact: 'Jan' },
        language: 'en',
        marginMode: 'incl',
        brands: [{
          name: 'B', intro: 'i',
          assets: { logoUrl: 'http://logo', heroImageUrl: 'http://hero', productImageUrls: [], description: 'd' },
          products: [{
            id: 'p1', name: 'P', intro: 'pi', tagline: 'tg', usps: [], why_it_sells: [],
            annual_volume_btl: 5, image_url: 'http://img',
            prices: { deliveryPriceExcl: '1', deliveryPriceIncl: '2', rsp: '3', marginExcl: '4', marginIncl: '5' },
          }],
        }],
      },
    })
    expect(input.marginMode).toBe('incl')
    expect(input.brands[0].images.logoDataUri).toContain('data:image/png')
    expect(input.brands[0].products[0].imageDataUri).toContain('data:image/png')
    expect(input.pdcLogoDataUri).toContain('data:image/png')
  })

  it('defaults marginMode to excl and applies translation overrides', async () => {
    const input = await buildDeckInput({
      deckData: {
        buyer: { company: 'AH', contact: 'Jan' }, language: 'nl',
        brands: [{
          name: 'B', intro: 'i',
          assets: { logoUrl: '', heroImageUrl: '', productImageUrls: [], description: 'd' },
          products: [{
            id: 'p1', name: 'P', intro: 'orig', tagline: 'tg', usps: [], why_it_sells: [],
            annual_volume_btl: 0, image_url: '',
            prices: { deliveryPriceExcl: '', deliveryPriceIncl: '', rsp: '', marginExcl: '', marginIncl: '' },
          }],
        }],
      },
      translationOverrides: { 'intro_0_p1': 'translated' },
    })
    expect(input.marginMode).toBe('excl')
    expect(input.brands[0].products[0].intro).toBe('translated')
  })
})
