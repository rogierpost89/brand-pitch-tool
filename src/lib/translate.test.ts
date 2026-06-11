import { describe, it, expect, vi, beforeEach } from 'vitest'
import { translateToNl } from './translate'

beforeEach(() => { vi.restoreAllMocks() })

const INPUT = {
  'tagline_clarea': 'Escape the ordinary, enjoy a frenzy of freshness',
  'usp_0_clarea': 'Peachy notes · exotic spices · fine bubbles',
  'why_0_clarea': 'New wine-based fizz — growing demand for lighter alternatives',
}

const NL_OUTPUT = {
  'tagline_clarea': 'Ontsnaap aan het gewone, geniet van een explosie van frisheid',
  'usp_0_clarea': 'Perziknoten · exotische specerijen · fijne bruis',
  'why_0_clarea': 'Nieuwe wijnkategorie — groeiende vraag naar lichtere alternatieven',
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function() {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(NL_OUTPUT) }],
        }),
      },
    }
  }),
}))

describe('translateToNl', () => {
  it('returns translated fields with same keys', async () => {
    const result = await translateToNl(INPUT)
    expect(Object.keys(result)).toEqual(Object.keys(INPUT))
    expect(result['tagline_clarea']).toContain('Ontsnaap')
  })

  it('throws when Claude returns no JSON', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    vi.mocked(Anthropic).mockImplementationOnce(function() {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Could not translate.' }],
          }),
        },
      }
    } as never)

    await expect(translateToNl(INPUT)).rejects.toThrow('no JSON')
  })
})
