import { NextRequest, NextResponse } from 'next/server'
import { screenshotUrl } from '@/lib/screenshot'
import { extractBrandAssets } from '@/lib/vision'

export const maxDuration = 60 // Vercel Fluid Compute

export async function POST(req: NextRequest) {
  try {
    let url: string
    let uploadedScreenshot: Buffer | null = null

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      url = (form.get('url') as string) || ''
      const file = form.get('screenshot') as File | null
      if (file) {
        const bytes = await file.arrayBuffer()
        uploadedScreenshot = Buffer.from(bytes)
      }
    } else {
      const body = await req.json() as { url: string }
      url = body.url
    }

    if (!url || !URL.canParse(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    let screenshot: Buffer
    if (uploadedScreenshot) {
      screenshot = uploadedScreenshot
    } else {
      try {
        screenshot = await screenshotUrl(url)
      } catch {
        return NextResponse.json(
          { error: 'Could not reach URL', fallback: true },
          { status: 422 }
        )
      }
    }

    const assets = await extractBrandAssets(screenshot, url)
    return NextResponse.json({ assets })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
