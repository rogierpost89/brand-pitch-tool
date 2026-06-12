import { describe, it, expect } from 'vitest'
import {
  titleSlide,
  brandIntroSlide,
  productIntroSlide,
  pricingSlide,
  overviewSlide,
} from './slides'
import type { DeckBrand, DeckProduct } from '@/lib/types'

const MOCK_ASSETS = {
  logoDataUri: 'data:image/svg+xml;base64,abc',
  heroDataUri: 'data:image/jpeg;base64,def',
  productDataUris: ['data:image/png;base64,ghi'],
  description: 'A great brand.',
}

const MOCK_PRODUCT: DeckProduct = {
  id: 'clarea',
  name: 'Clarea',
  intro: 'Peach sparkling wine.',
  tagline: 'Escape the ordinary',
  usps: ['Fine bubbles', 'Locally grown'],
  why_it_sells: ['New category', 'Golden colour'],
  annual_volume_btl: 2400,
  image_url: '',
  imageDataUri: 'data:image/png;base64,ghi',
  prices: { deliveryPriceExcl: '€7.20', deliveryPriceIncl: '€8.50', rsp: '€17.95', marginExcl: '28%', marginIncl: '22%' },
}

const MOCK_BRAND: DeckBrand = {
  name: 'La Mundial Barcelona',
  intro: 'Wine-based sparkling beverages from Barcelona.',
  assets: MOCK_ASSETS,
  products: [MOCK_PRODUCT],
}

describe('titleSlide', () => {
  it('contains brand name as h1', () => {
    const html = titleSlide({
      brandName: 'La Mundial Barcelona',
      subtitle: 'Wine-based sparkling from Barcelona.',
      heroImageUri: MOCK_ASSETS.heroDataUri,
      pdcLogoUri: 'data:image/png;base64,pdc',
      brandLogoUri: MOCK_ASSETS.logoDataUri,
      buyerCompany: 'Albert Heijn',
      buyerContact: 'Jan de Vries',
      slideNum: 1,
      totalSlides: 6,
    })
    expect(html).toContain('La Mundial Barcelona')
    expect(html).toContain('s-title')
    expect(html).toContain('accent-bar')
    expect(html).toContain('Albert Heijn')
    expect(html).toContain('data-en=')
    expect(html).toContain('data-nl=')
  })
})

describe('brandIntroSlide', () => {
  it('contains brand intro text and hero image', () => {
    const html = brandIntroSlide({
      brand: MOCK_BRAND,
      slideNum: 2,
      totalSlides: 6,
    })
    expect(html).toContain('s-brand-intro')
    expect(html).toContain('Wine-based sparkling beverages from Barcelona.')
    expect(html).toContain(MOCK_ASSETS.heroDataUri)
  })
})

describe('productIntroSlide', () => {
  it('contains product name, USPs, and brand label', () => {
    const html = productIntroSlide({
      brandName: 'La Mundial Barcelona',
      product: MOCK_PRODUCT,
      slideNum: 3,
      totalSlides: 6,
    })
    expect(html).toContain('s-product')
    expect(html).toContain('Clarea')
    expect(html).toContain('Fine bubbles')
    expect(html).toContain('La Mundial Barcelona')
  })
})

describe('pricingSlide', () => {
  it('contains all three price cards with RSP highlighted', () => {
    const html = pricingSlide({
      brandName: 'La Mundial Barcelona',
      product: MOCK_PRODUCT,
      slideNum: 4,
      totalSlides: 6,
    })
    expect(html).toContain('s-pricing')
    expect(html).toContain('€8.50')
    expect(html).toContain('€17.95')
    expect(html).toContain('28%')
    expect(html).toContain('pcard hl') // RSP highlighted card
    expect(html).toContain('New category')
  })
})

describe('overviewSlide', () => {
  it('contains brand column and all products', () => {
    const html = overviewSlide({
      brands: [MOCK_BRAND],
      slideNum: 5,
      totalSlides: 5,
    })
    expect(html).toContain('s-overview')
    expect(html).toContain('La Mundial Barcelona')
    expect(html).toContain('Clarea')
    expect(html).toContain('€17.95')
    expect(html).toContain('mpill') // margin pill
    expect(html).toContain('2,400') // annual volume formatted
  })
})
