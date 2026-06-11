export interface Product {
  id: string
  name: string
  intro: string
  tagline: string
  usps: string[]
  why_it_sells: string[]
  annual_volume_btl: number
  image_url: string
}

export interface BrandData {
  name: string
  url: string
  intro: string
  products: Product[]
}

export interface Buyer {
  company: string
  contact: string
}

export interface YamlInput {
  buyer: Buyer
  brands: BrandData[]
}

export interface PriceRow {
  productId: string
  brandName: string
  deliveryPrice: string
  rsp: string
  margin: string
}

export interface BrandAssets {
  logoUrl: string
  heroImageUrl: string
  productImageUrls: string[]
  description: string
}

// After image embedding: all URLs replaced with data URIs
export interface BrandAssetsEmbedded {
  logoDataUri: string
  heroDataUri: string
  productDataUris: string[]
  description: string
}

export interface PriceData {
  deliveryPrice: string
  rsp: string
  margin: string
}

export interface DeckProduct extends Product {
  imageDataUri: string
  prices: PriceData
}

export interface DeckBrand {
  name: string
  intro: string
  assets: BrandAssetsEmbedded
  products: DeckProduct[]
}

export interface DeckData {
  buyer: Buyer
  brands: DeckBrand[]
  language: 'en' | 'nl'
}

export interface ExtractedProduct {
  id: string           // slug of product name, e.g. "clarea"
  name: string
  intro: string
  tagline: string
  usps: string[]       // 3 bullets
  why_it_sells: string[] // 3 bullets
  annual_volume_btl: number
  image_url: string    // filled from productImageUrls[index] if available
}

export interface ExtractedBrand {
  name: string
  intro: string
  products: ExtractedProduct[]
}

export type TranslationMap = Record<string, string>

// Per-product text fields that can be translated
export interface ProductTextFields {
  tagline: string
  intro: string
  usps: string[]
  why_it_sells: string[]
}

export interface TranslatableFields {
  [brandIdx_productId: string]: ProductTextFields
  // key format: "0_clarea", "1_rosso" etc.
}
