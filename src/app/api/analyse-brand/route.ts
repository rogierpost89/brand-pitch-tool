import { NextRequest, NextResponse } from 'next/server'
import { scrapeBrandPage } from '@/lib/scrape'
import { extractAssetsFromPage, extractAssetsFromImage, extractBrandContentFromImage, extractFromPdf, extractBrandContent } from '@/lib/vision'

export const maxDuration = 60

async function compressToJpeg(buffer: Buffer): Promise<Buffer> {
  // Client compresses images to JPEG before upload; pass through as-is
  return buffer
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const url = (form.get('url') as string) || 'https://unknown.com'
      const file = form.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

      const mime = file.type
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      if (mime === 'application/pdf') {
        const { assets, brandContent } = await extractFromPdf(buffer, url)
        return NextResponse.json({ assets, brandContent })
      }

      if (mime.startsWith('image/')) {
        const compressed = await compressToJpeg(buffer)
        const [assets, brandContent] = await Promise.all([
          extractAssetsFromImage(compressed, url),
          extractBrandContentFromImage(compressed, url),
        ])
        return NextResponse.json({ assets, brandContent })
      }

      return NextResponse.json(
        { error: 'Unsupported file type. Upload PNG, JPG, or PDF.' },
        { status: 400 }
      )
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
