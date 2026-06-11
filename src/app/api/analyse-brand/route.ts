import { NextRequest, NextResponse } from 'next/server'
import { scrapeBrandPage } from '@/lib/scrape'
import { extractAssetsFromPage, extractAssetsFromImage, extractBrandContent } from '@/lib/vision'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    // Fallback path: user uploaded a screenshot
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const url = (form.get('url') as string) || 'https://unknown.com'
      const file = form.get('screenshot') as File | null
      if (!file) return NextResponse.json({ error: 'No screenshot uploaded' }, { status: 400 })

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const assets = await extractAssetsFromImage(buffer, url)
      // No brandContent for screenshot path — user fills manually
      return NextResponse.json({ assets })
    }

    // Primary path: scrape via Jina Reader
    const { url } = await req.json() as { url: string }
    if (!url || !URL.canParse(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    let page
    try {
      page = await scrapeBrandPage(url)
    } catch {
      return NextResponse.json({ error: 'Could not fetch page', fallback: true }, { status: 422 })
    }

    const [assets, brandContent] = await Promise.all([
      extractAssetsFromPage(page, url),
      extractBrandContent(page, url, []),
    ])

    // Fill image_url from assets.productImageUrls
    brandContent.products.forEach((p, i) => {
      if (!p.image_url && assets.productImageUrls[i]) {
        p.image_url = assets.productImageUrls[i]
      }
    })

    return NextResponse.json({ assets, brandContent })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
