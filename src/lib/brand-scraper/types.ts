/**
 * Raw, deterministic page data captured by the Playwright crawl.
 * No LLM, no heuristic guesswork — just what the DOM says.
 */
export interface RawImage {
  src: string
  srcsetLargest?: string
  alt: string
  filename: string         // last URL segment, lowercased
  width: number            // rendered px
  height: number
  areaPx: number
  inHeader: boolean
  isAboveFold: boolean
}

export interface RawSvg {
  outerHTML: string
  ariaLabel: string
  inHeader: boolean
}

export interface RawPageData {
  url: string
  title: string
  description: string
  visibleText: string      // limited to ~3000 chars
  ogImage?: string
  twitterImage?: string
  favicon?: string
  appleTouchIcon?: string
  images: RawImage[]
  svgs: RawSvg[]
  cssCustomProps: Record<string, string>
  h1FontFamily: string
  bodyFontFamily: string
}

/**
 * Final, classified scrape result. This is what the CLI writes to
 * data/brand-cache/<slug>.json and what /api/analyse-brand reads.
 *
 * Note: `reference.colors` and `reference.fonts` are extracted for the
 * UI debug panel only. They are NEVER fed into the deck composer — the
 * composer's input type has no slot for them. See feedback-pdc-format-only.
 */
export interface BrandScrapeResult {
  url: string
  scrapedAt: string
  title: string
  description: string
  visibleText: string
  classification: {
    logoUrl: string
    heroImageUrl: string
    productImageUrls: string[]
  }
  reference: {
    colors: string[]
    h1FontFamily: string
    bodyFontFamily: string
  }
}
