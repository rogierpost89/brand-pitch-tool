import { NextRequest, NextResponse } from 'next/server'
import { imageToDataUri } from '@/lib/image-embed'
import { buildDeck } from '@/lib/generate-deck'
import type { DeckData, DeckBrand, DeckProduct, BrandAssets } from '@/lib/types'

const PDC_LOGO_URL =
  'https://pineappledrinks.com/wp-content/uploads/2025/02/Frame-76.png'

export const maxDuration = 60

interface GenerateRequest {
  deckData: Omit<DeckData, 'brands'> & {
    brands: Array<{
      name: string
      intro: string
      assets: BrandAssets
      products: Array<Omit<DeckProduct, 'imageDataUri'>>
    }>
  }
  translationOverrides?: Record<string, string>
}

export async function POST(req: NextRequest) {
  try {
    const { deckData, translationOverrides = {} } = await req.json() as GenerateRequest

    // Embed PDC logo
    const pdcLogoUri = await imageToDataUri(PDC_LOGO_URL)

    // Embed all brand images
    const embeddedBrands: DeckBrand[] = await Promise.all(
      deckData.brands.map(async (brand, bi) => {
        const [logoDataUri, heroDataUri, ...productDataUris] = await Promise.all([
          imageToDataUri(brand.assets.logoUrl).catch(() => ''),
          imageToDataUri(brand.assets.heroImageUrl).catch(() => ''),
          ...brand.assets.productImageUrls.map(u => imageToDataUri(u).catch(() => '')),
        ])

        const products: DeckProduct[] = brand.products.map((p, idx) => {
          const imageDataUri = productDataUris[idx] || ''

          const applyOverride = (key: string, fallback: string) =>
            translationOverrides[key] ?? fallback

          return {
            ...p,
            imageDataUri,
            tagline: applyOverride(`tagline_${bi}_${p.id}`, p.tagline),
            intro: applyOverride(`intro_${bi}_${p.id}`, p.intro),
            usps: p.usps.map((u, i) =>
              applyOverride(`usp_${i}_${bi}_${p.id}`, u)
            ),
            why_it_sells: p.why_it_sells.map((w, i) =>
              applyOverride(`why_${i}_${bi}_${p.id}`, w)
            ),
          }
        })

        return {
          name: brand.name,
          intro: brand.intro,
          assets: {
            logoDataUri,
            heroDataUri,
            productDataUris,
            description: brand.assets.description,
          },
          products,
        }
      })
    )

    const finalDeck: DeckData = {
      buyer: deckData.buyer,
      language: deckData.language,
      brands: embeddedBrands,
    }

    const html = buildDeck(finalDeck, pdcLogoUri)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pitch-deck.html"',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
