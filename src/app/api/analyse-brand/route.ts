import { NextRequest, NextResponse } from 'next/server'
import { readCache, writeCache } from '@/lib/brand-scraper/cache'
import { scrapeBrand } from '@/lib/brand-scraper'
import {
  extractAssetsFromImage,
  extractBrandContentFromImage,
  extractBrandContentFromText,
  extractFromPdf,
} from '@/lib/vision'
import type { BrandAssets } from '@/lib/types'
import type { BrandScrapeResult } from '@/lib/brand-scraper/types'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    // File-upload path (PDF / image) — independent of the scrape cache.
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const url = (form.get('url') as string) || 'https://unknown.com'
      const file = form.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

      const buffer = Buffer.from(await file.arrayBuffer())
      const mime = file.type

      if (mime === 'application/pdf') {
        const { assets, brandContent } = await extractFromPdf(buffer, url)
        return NextResponse.json({ assets, brandContent })
      }
      if (mime.startsWith('image/')) {
        const [assets, brandContent] = await Promise.all([
          extractAssetsFromImage(buffer, url),
          extractBrandContentFromImage(buffer, url),
        ])
        return NextResponse.json({ assets, brandContent })
      }
      return NextResponse.json(
        { error: 'Unsupported file type. Upload PNG, JPG, or PDF.' },
        { status: 400 },
      )
    }

    // URL path — read the deterministic scrape cache, then ask Claude only for copy.
    const { url } = (await req.json()) as { url: string }
    if (!url || !URL.canParse(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Read cache if present; otherwise scrape live and write to cache so the next call is instant.
    let cache: BrandScrapeResult | null = readCache(url)
    if (!cache) {
      try {
        cache = await scrapeBrand(url)
        writeCache(url, cache)
      } catch (err) {
        return NextResponse.json(
          {
            error:
              `Could not scrape ${url}: ${err instanceof Error ? err.message : 'unknown error'}. ` +
              `Try uploading a PDF or screenshot instead.`,
            fallback: true,
          },
          { status: 422 },
        )
      }
    }

    const assets: BrandAssets = {
      logoUrl: cache.classification.logoUrl,
      heroImageUrl: cache.classification.heroImageUrl,
      productImageUrls: cache.classification.productImageUrls,
      description: cache.description,
    }

    const brandContent = await extractBrandContentFromText(
      url,
      cache.visibleText,
      cache.classification.productImageUrls,
    )

    return NextResponse.json({
      assets,
      brandContent,
      reference: cache.reference, // for UI debug panel only — never enters the deck
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
