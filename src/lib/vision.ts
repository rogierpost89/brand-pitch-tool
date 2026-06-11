import Anthropic from '@anthropic-ai/sdk'
import type { BrandAssets } from './types'
import type { ScrapedPage } from './scrape'

const client = new Anthropic()

export async function extractAssetsFromPage(
  page: ScrapedPage,
  brandUrl: string
): Promise<BrandAssets> {
  const origin = new URL(brandUrl).origin
  const imageList = Object.entries(page.images)
    .map(([url, desc]) => `${url} — ${desc || 'no description'}`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are analysing the brand website: ${brandUrl}

PAGE CONTENT (markdown):
${page.content.slice(0, 8000)}

ALL IMAGES FOUND ON PAGE:
${imageList.slice(0, 4000)}

Identify the following and return ONLY a JSON object (no markdown, no explanation):
{
  "logoUrl": "absolute URL of the brand logo (look for 'logo' in URL/alt/class, header images, SVG files)",
  "heroImageUrl": "absolute URL of the best lifestyle or hero photo (large, atmospheric, full-bleed)",
  "productImageUrls": ["absolute URLs of product pack shots / bottle images"],
  "description": "one paragraph brand description based on page content"
}

Rules:
- All URLs must be absolute. If relative, prepend ${origin}
- productImageUrls should only include actual product images, not UI icons or backgrounds
- Return only the JSON object, nothing else`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude returned no JSON')
  return JSON.parse(match[0]) as BrandAssets
}

export async function extractAssetsFromImage(
  screenshotBuffer: Buffer,
  brandUrl: string
): Promise<BrandAssets> {
  const origin = new URL(brandUrl).origin
  const b64 = screenshotBuffer.toString('base64')

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
  "heroImageUrl": "absolute URL of best lifestyle/hero photo",
  "productImageUrls": ["absolute URL of product pack shot"],
  "description": "one paragraph brand description based on what you see"
}
If any URL is relative, prepend ${origin}.
Return only the JSON object.`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude Vision returned no JSON')
  return JSON.parse(match[0]) as BrandAssets
}
