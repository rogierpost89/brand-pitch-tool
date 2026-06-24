import { NextRequest, NextResponse } from 'next/server'
import { imageToDataUri } from '@/lib/image-embed'
import { composeDeck } from '@/lib/deck-composer'
import type {
  BrandSlot,
  DeckInput,
  Language,
  MarginMode,
  ProductSlot,
} from '@/lib/deck-template/types'
import type { BrandAssets, ExtractedProduct } from '@/lib/types'

const PDC_LOGO_URL =
  'https://pineappledrinks.com/wp-content/uploads/2025/02/Frame-76.png'

export const maxDuration = 60

interface IncomingProduct extends ExtractedProduct {
  prices: {
    deliveryPriceExcl: string
    deliveryPriceIncl: string
    rsp: string
    marginExcl: string
    marginIncl: string
  }
  /** Per-product image override (data URI) from Step 3 upload. Takes precedence over scraped image. */
  imageOverrideDataUri?: string
}

interface IncomingBrand {
  name: string
  intro: string
  assets: BrandAssets
  products: IncomingProduct[]
}

interface GenerateRequest {
  deckData: {
    buyer: { company: string; contact: string }
    language: Language
    marginMode?: MarginMode
    brands: IncomingBrand[]
  }
  translationOverrides?: Record<string, string>
}

function applyOverride(
  overrides: Record<string, string>,
  key: string,
  fallback: string,
): string {
  return overrides[key] ?? fallback
}

export async function POST(req: NextRequest) {
  try {
    const { deckData, translationOverrides = {} } = (await req.json()) as GenerateRequest
    const marginMode: MarginMode = deckData.marginMode ?? 'excl'

    const pdcLogoDataUri = await imageToDataUri(PDC_LOGO_URL)

    const brands: BrandSlot[] = await Promise.all(
      deckData.brands.map(async (brand, bi) => {
        const [logoDataUri, heroDataUri] = await Promise.all([
          imageToDataUri(brand.assets.logoUrl).catch(() => ''),
          imageToDataUri(brand.assets.heroImageUrl).catch(() => ''),
        ])

        // Fetch each product's specific image_url (set by Claude during brand analysis
        // and editable by the user). Pairing by positional index was the prior bug —
        // scrape order and Claude's product order are independent. Per-product upload
        // override still takes top precedence.
        const products: ProductSlot[] = await Promise.all(
          brand.products.map(async p => {
            let imageDataUri = p.imageOverrideDataUri || ''
            if (!imageDataUri && p.image_url) {
              imageDataUri = await imageToDataUri(p.image_url).catch(() => '')
            }
            return {
              id: p.id,
              name: p.name,
              intro: applyOverride(translationOverrides, `intro_${bi}_${p.id}`, p.intro),
              tagline: applyOverride(translationOverrides, `tagline_${bi}_${p.id}`, p.tagline),
              usps: p.usps.map((u, i) =>
                applyOverride(translationOverrides, `usp_${i}_${bi}_${p.id}`, u),
              ),
              whyItSells: p.why_it_sells.map((w, i) =>
                applyOverride(translationOverrides, `why_${i}_${bi}_${p.id}`, w),
              ),
              annualVolumeBtl: p.annual_volume_btl ?? 0,
              imageDataUri,
              prices: p.prices,
            }
          }),
        )

        return {
          name: brand.name,
          intro: brand.intro,
          description: brand.assets.description,
          images: { logoDataUri, heroDataUri },
          products,
        }
      }),
    )

    const input: DeckInput = {
      buyer: deckData.buyer,
      language: deckData.language,
      marginMode,
      pdcLogoDataUri,
      brands,
    }

    const buffer = await composeDeck(input)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': 'attachment; filename="pitch-deck.pptx"',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
