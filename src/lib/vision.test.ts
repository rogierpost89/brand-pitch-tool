import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      messages: { create: mockCreate },
    }
  }),
}))

import { extractAssetsFromPage, extractAssetsFromImage } from './vision'
import type { ScrapedPage } from './scrape'

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
