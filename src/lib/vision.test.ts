import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractBrandAssets } from './vision'

beforeEach(() => { vi.restoreAllMocks() })

const MOCK_RESPONSE = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      logoUrl: 'https://example.com/logo.png',
      heroImageUrl: 'https://example.com/hero.jpg',
      productImageUrls: ['https://example.com/product1.png'],
      description: 'A premium spirits brand from Spain.',
    }),
  }],
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      messages: {
        create: vi.fn().mockResolvedValue(MOCK_RESPONSE),
      },
    }
  }),
}))

describe('extractBrandAssets', () => {
  it('returns parsed brand assets from Claude response', async () => {
    const result = await extractBrandAssets(
      Buffer.from('fakescreenshot'),
      'https://example.com'
    )
    expect(result.logoUrl).toBe('https://example.com/logo.png')
    expect(result.heroImageUrl).toBe('https://example.com/hero.jpg')
    expect(result.productImageUrls).toHaveLength(1)
    expect(result.description).toContain('Spain')
  })

  it('throws when Claude returns no JSON', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    vi.mocked(Anthropic).mockImplementationOnce(function () {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Sorry, I cannot analyse this image.' }],
          }),
        },
      } as never
    })

    await expect(
      extractBrandAssets(Buffer.from('x'), 'https://example.com')
    ).rejects.toThrow('no JSON')
  })
})
