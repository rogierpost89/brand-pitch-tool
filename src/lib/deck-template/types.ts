/**
 * Input type for the PPTX deck composer.
 *
 * Invariant: only image data URIs and copy strings flow in from the brand. There is
 * deliberately no field for brand colors, brand fonts, or brand-specific layout overrides
 * — the composer's styling comes ONLY from src/lib/deck-template/tokens.ts. This makes
 * "every deck uses the PDC house style" a type-level guarantee: a brand cannot smuggle
 * its own visual identity into the deck because the type has nowhere to put it.
 */

export type Language = 'en' | 'nl'
export type MarginMode = 'excl' | 'incl'

export interface BrandImageSlots {
  /** Brand logo data URI (rendered white-on-black on the title slide). */
  logoDataUri: string
  /** Hero/lifestyle image data URI for title + brand intro slides. */
  heroDataUri: string
}

export interface ProductSlot {
  id: string
  name: string
  intro: string
  tagline: string
  usps: string[]
  whyItSells: string[]
  annualVolumeBtl: number
  imageDataUri: string
  prices: {
    deliveryPriceExcl: string
    deliveryPriceIncl: string
    rsp: string
    marginExcl: string
    marginIncl: string
  }
}

export interface BrandSlot {
  name: string
  intro: string
  description: string
  images: BrandImageSlots
  products: ProductSlot[]
}

export interface BuyerSlot {
  company: string
  contact: string
}

export interface DeckInput {
  buyer: BuyerSlot
  brands: BrandSlot[]
  language: Language
  marginMode: MarginMode
  /** PDC's own logo data URI — always rendered on yellow/black, never replaced. */
  pdcLogoDataUri: string
}
