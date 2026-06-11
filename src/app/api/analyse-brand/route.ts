import { NextRequest, NextResponse } from 'next/server'
import { screenshotUrl } from '@/lib/screenshot'
import { extractBrandAssets } from '@/lib/vision'

export const maxDuration = 60 // Vercel Fluid Compute

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url: string }

    if (!url || !URL.canParse(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    let screenshot: Buffer
    try {
      screenshot = await screenshotUrl(url)
    } catch {
      return NextResponse.json(
        { error: 'Could not reach URL', fallback: true },
        { status: 422 }
      )
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
