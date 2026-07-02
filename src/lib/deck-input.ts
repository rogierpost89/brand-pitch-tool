import { imageToDataUri } from '@/lib/image-embed'
import type {
  BrandSlot,
  DeckInput,
  Language,
  MarginMode,
  ProductSlot,
} from '@/lib/deck-template/types'
import type { BrandAssets, ExtractedProduct } from '@/lib/types'

export const PDC_LOGO_URL =
  'https://pineappledrinks.com/wp-content/uploads/2025/02/Frame-76.png'

export interface IncomingProduct extends ExtractedProduct {
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

export interface IncomingBrand {
  name: string
  intro: string
  assets: BrandAssets
  products: IncomingProduct[]
}

export interface GenerateRequest {
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

export async function buildDeckInput(body: GenerateRequest): Promise<DeckInput> {
  const { deckData, translationOverrides = {} } = body
  const marginMode: MarginMode = deckData.marginMode ?? 'excl'

  const pdcLogoDataUri = await imageToDataUri(PDC_LOGO_URL)

  const brands: BrandSlot[] = await Promise.all(
    deckData.brands.map(async (brand, bi) => {
      const [logoDataUri, heroDataUri] = await Promise.all([
        imageToDataUri(brand.assets.logoUrl).catch(() => ''),
        imageToDataUri(brand.assets.heroImageUrl).catch(() => ''),
      ])

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

  return {
    buyer: deckData.buyer,
    language: deckData.language,
    marginMode,
    pdcLogoDataUri,
    brands,
  }
}
