import Anthropic from '@anthropic-ai/sdk'
import type { BrandAssets } from './types'

export async function extractBrandAssets(
  screenshotBuffer: Buffer,
  brandUrl: string
): Promise<BrandAssets> {
  const client = new Anthropic()
  const b64 = screenshotBuffer.toString('base64')
  const origin = new URL(brandUrl).origin

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
        },
        {
          type: 'text',
          text: `This is a screenshot of ${brandUrl}.
Extract as JSON (no markdown, just JSON):
{
  "logoUrl": "absolute URL of brand logo",
  "heroImageUrl": "absolute URL of best lifestyle/hero photo for a title slide",
  "productImageUrls": ["absolute URL of product pack shot 1", "..."],
  "description": "one paragraph brand description based on what you see"
}
If any URL is relative, prepend ${origin}.
Return only the JSON object.`,
        },
      ],
    }],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude Vision returned no JSON')

  return JSON.parse(match[0]) as BrandAssets
}
