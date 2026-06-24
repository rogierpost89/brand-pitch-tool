import Anthropic from '@anthropic-ai/sdk'
import type { BrandAssets, ExtractedBrand } from './types'

const client = new Anthropic()

// Expects a JPEG buffer — client compresses to JPEG via canvas.toBlob before upload
export async function extractAssetsFromImage(
  screenshotBuffer: Buffer,
  brandUrl: string
): Promise<BrandAssets> {
  const origin = new URL(brandUrl).origin
  const b64 = screenshotBuffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
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

// Expects a JPEG buffer — client compresses to JPEG via canvas.toBlob before upload
export async function extractBrandContentFromImage(
  screenshotBuffer: Buffer,
  brandUrl: string
): Promise<ExtractedBrand> {
  const b64 = screenshotBuffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
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

Read all text visible in the image and extract brand and product information.
Return ONLY a JSON object (no markdown):
{
  "name": "brand name",
  "intro": "2-3 sentence brand intro for a B2B pitch deck",
  "products": [
    {
      "id": "slug-of-product-name",
      "name": "Product Name",
      "intro": "2-3 sentence product description",
      "tagline": "short punchy tagline",
      "usps": [
        "USP 1 — key attribute · detail",
        "USP 2 — key attribute · detail",
        "USP 3 — key attribute · detail"
      ],
      "why_it_sells": [
        "Reason 1 why a retailer should stock this",
        "Reason 2",
        "Reason 3"
      ],
      "annual_volume_btl": 0,
      "image_url": ""
    }
  ]
}

Rules:
- id must be a lowercase slug (e.g. "clarea", "aperitif-rosso")
- usps should use " · " as separator for sub-points
- why_it_sells should be retailer-facing reasons (margin, trend, consumer demand)
- annual_volume_btl is always 0
- image_url is always ""
- If product details are not visible, use empty strings for text fields
- Return only the JSON object`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude Vision returned no JSON for brand content')
  return JSON.parse(match[0]) as ExtractedBrand
}

export async function extractFromPdf(
  pdfBuffer: Buffer,
  brandUrl: string
): Promise<{ assets: BrandAssets; brandContent: ExtractedBrand }> {
  const b64 = pdfBuffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: b64 },
        } as any,
        {
          type: 'text',
          text: `This is a brand document for ${brandUrl}.

Read all pages and extract both visual asset descriptions and brand content.
Return ONLY a JSON object (no markdown):
{
  "assets": {
    "logoUrl": "",
    "heroImageUrl": "",
    "productImageUrls": [],
    "description": "one paragraph describing the brand based on what you see in the document"
  },
  "brandContent": {
    "name": "brand name",
    "intro": "2-3 sentence brand intro for a B2B pitch deck",
    "products": [
      {
        "id": "slug-of-product-name",
        "name": "Product Name",
        "intro": "2-3 sentence product description",
        "tagline": "short punchy tagline",
        "usps": [
          "USP 1 — key attribute · detail",
          "USP 2 — key attribute · detail",
          "USP 3 — key attribute · detail"
        ],
        "why_it_sells": [
          "Reason 1 why a retailer should stock this",
          "Reason 2",
          "Reason 3"
        ],
        "annual_volume_btl": 0,
        "image_url": ""
      }
    ]
  }
}

Rules:
- logoUrl, heroImageUrl, productImageUrls must always be empty strings / empty array (no real URLs available from a PDF)
- description should be a rich one-paragraph summary of the brand based on all pages
- id must be a lowercase slug (e.g. "clarea", "aperitif-rosso")
- usps should use " · " as separator for sub-points
- why_it_sells should be retailer-facing reasons (margin, trend, consumer demand)
- annual_volume_btl is always 0
- image_url is always ""
- Include all products found in the document
- Return only the JSON object`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude returned no JSON from PDF')
  return JSON.parse(match[0]) as { assets: BrandAssets; brandContent: ExtractedBrand }
}

/**
 * Generate ExtractedBrand copy from already-scraped visible text. Used by the cache-backed
 * flow — the scraper CLI captured the text deterministically, Claude only writes copy.
 */
export async function extractBrandContentFromText(
  brandUrl: string,
  visibleText: string,
  productImageUrls: string[],
): Promise<ExtractedBrand> {
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are analysing the brand website: ${brandUrl}

PAGE TEXT (extracted from the live DOM):
${visibleText.slice(0, 10000)}

Extract the brand and product information and return ONLY a JSON object (no markdown):
{
  "name": "brand name",
  "intro": "2-3 sentence brand intro for a B2B pitch deck",
  "products": [
    {
      "id": "slug-of-product-name",
      "name": "Product Name",
      "intro": "2-3 sentence product description",
      "tagline": "short punchy tagline",
      "usps": ["USP 1 — detail", "USP 2 — detail", "USP 3 — detail"],
      "why_it_sells": ["Reason 1", "Reason 2", "Reason 3"],
      "annual_volume_btl": 0,
      "image_url": ""
    }
  ]
}

Rules:
- id is a lowercase slug
- usps use " · " separator for sub-points
- why_it_sells are retailer-facing
- annual_volume_btl is 0; image_url is ""
- Return only the JSON object`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude returned no JSON for brand content')
  const result = JSON.parse(match[0]) as ExtractedBrand
  result.products.forEach((p, i) => {
    if (!p.image_url && productImageUrls[i]) p.image_url = productImageUrls[i]
  })
  return result
}

