import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      messages: { create: mockCreate },
    }
  }),
}))

import { extractAssetsFromPage, extractAssetsFromImage, extractBrandContentFromImage, extractFromPdf } from './vision'
import type { ScrapedPage } from './scrape'
import type { ExtractedBrand } from './types'

const MOCK_ASSETS = {
  logoUrl: 'https://example.com/logo.png',
  heroImageUrl: 'https://example.com/hero.jpg',
  productImageUrls: ['https://example.com/product1.png'],
  description: 'A premium spirits brand from Spain.',
}

const MOCK_RESPONSE = {
  content: [{ type: 'text', text: JSON.stringify(MOCK_ASSETS) }],
}

beforeEach(() => {
  vi.resetAllMocks()
  mockCreate.mockResolvedValue(MOCK_RESPONSE)
})

const MOCK_PAGE: ScrapedPage = {
  title: 'Example Brand',
  content: '# Example Brand\nA premium spirits brand from Spain.',
  images: {
    'https://example.com/logo.png': 'Example logo',
    'https://example.com/hero.jpg': 'Hero image',
  },
}

describe('extractAssetsFromPage', () => {
  it('returns parsed brand assets from Claude response', async () => {
    const result = await extractAssetsFromPage(MOCK_PAGE, 'https://example.com')
    expect(result.logoUrl).toBe('https://example.com/logo.png')
    expect(result.heroImageUrl).toBe('https://example.com/hero.jpg')
    expect(result.productImageUrls).toHaveLength(1)
    expect(result.description).toContain('Spain')
  })

  it('throws when Claude returns no JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Sorry, I cannot analyse this page.' }],
    })

    await expect(
      extractAssetsFromPage(MOCK_PAGE, 'https://example.com')
    ).rejects.toThrow('no JSON')
  })
})

describe('extractAssetsFromImage', () => {
  it('returns parsed brand assets from Claude response', async () => {
    const result = await extractAssetsFromImage(
      Buffer.from('fakescreenshot'),
      'https://example.com'
    )
    expect(result.logoUrl).toBe('https://example.com/logo.png')
    expect(result.heroImageUrl).toBe('https://example.com/hero.jpg')
    expect(result.productImageUrls).toHaveLength(1)
    expect(result.description).toContain('Spain')
  })

  it('throws when Claude returns no JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Sorry, I cannot analyse this image.' }],
    })

    await expect(
      extractAssetsFromImage(Buffer.from('x'), 'https://example.com')
    ).rejects.toThrow('no JSON')
  })
})

const MOCK_BRAND: ExtractedBrand = {
  name: 'Example Brand',
  intro: 'A premium spirits brand from Spain.',
  products: [
    {
      id: 'example-product',
      name: 'Example Product',
      intro: 'A crisp, refreshing spirit.',
      tagline: 'Taste the sunshine',
      usps: ['USP 1 · detail', 'USP 2 · detail', 'USP 3 · detail'],
      why_it_sells: ['Reason 1', 'Reason 2', 'Reason 3'],
      annual_volume_btl: 0,
      image_url: '',
    },
  ],
}

describe('extractBrandContentFromImage', () => {
  it('returns parsed brand content from Claude vision response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(MOCK_BRAND) }],
    })

    const result = await extractBrandContentFromImage(
      Buffer.from('fakescreenshot'),
      'https://example.com'
    )
    expect(result.name).toBe('Example Brand')
    expect(result.products).toHaveLength(1)
    expect(result.products[0].tagline).toBe('Taste the sunshine')
  })

  it('throws when Claude returns no JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Cannot read this image.' }],
    })

    await expect(
      extractBrandContentFromImage(Buffer.from('x'), 'https://example.com')
    ).rejects.toThrow('no JSON')
  })
})

const MOCK_PDF_RESULT = {
  assets: {
    logoUrl: '',
    heroImageUrl: '',
    productImageUrls: [],
    description: 'A premium spirits brand visible in the PDF.',
  },
  brandContent: MOCK_BRAND,
}

describe('extractFromPdf', () => {
  it('returns assets and brand content from PDF via Claude document API', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(MOCK_PDF_RESULT) }],
    })

    const result = await extractFromPdf(
      Buffer.from('fakepdfbytes'),
      'https://example.com'
    )
    expect(result.assets.description).toContain('PDF')
    expect(result.brandContent.name).toBe('Example Brand')
    expect(result.brandContent.products).toHaveLength(1)
  })

  it('throws when Claude returns no JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Cannot read this document.' }],
    })

    await expect(
      extractFromPdf(Buffer.from('x'), 'https://example.com')
    ).rejects.toThrow('no JSON')
  })
})
