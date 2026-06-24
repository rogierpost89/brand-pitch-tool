import { crawl } from './crawl'
import {
  pickLogo,
  pickHero,
  pickProducts,
  extractReferenceColors,
  mergeImages,
} from './classify'
import type { BrandScrapeResult, RawPageData } from './types'

export type { BrandScrapeResult, RawPageData } from './types'

/**
 * Scrape a brand site and produce a deterministic, classified result.
 * No LLM in this path — classification is rule-based and reproducible.
 */
export async function scrapeBrand(url: string): Promise<BrandScrapeResult> {
  const { home, productPages } = await crawl(url)

  const merged: RawPageData = {
    ...home,
    images: mergeImages([home.images, ...productPages.map(p => p.images)]),
  }

  const logoUrl = pickLogo(merged)
  const heroImageUrl = pickHero(merged, logoUrl)
  const excluded = new Set([logoUrl, heroImageUrl].filter(Boolean))
  const productImageUrls = pickProducts(merged, excluded)

  return {
    url,
    scrapedAt: new Date().toISOString(),
    title: home.title,
    description: home.description,
    visibleText: home.visibleText,
    classification: {
      logoUrl,
      heroImageUrl,
      productImageUrls,
    },
    reference: {
      colors: extractReferenceColors(merged.cssCustomProps),
      h1FontFamily: merged.h1FontFamily,
      bodyFontFamily: merged.bodyFontFamily,
    },
  }
}

/** Stable slug derived from URL for cache filenames. */
export function urlSlug(url: string): string {
  try {
    const u = new URL(url)
    const host = u.host.replace(/^www\./, '')
    const path = u.pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
    return path ? `${host}-${path}`.toLowerCase() : host.toLowerCase()
  } catch {
    return url.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  }
}
