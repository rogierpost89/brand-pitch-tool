import { NextRequest, NextResponse } from 'next/server'
import { parseExcel } from '@/lib/parse-excel'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url: string }
    if (!url || !URL.canParse(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Try to fetch the Excel file from the URL
    // Works for: direct download URLs, OneDrive share URLs with download params
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch file: HTTP ${res.status}. Try downloading the file and uploading it instead.` },
        { status: 422 }
      )
    }

    const contentType = res.headers.get('content-type') || ''
    const isExcel = contentType.includes('spreadsheetml') ||
                    contentType.includes('octet-stream') ||
                    url.includes('.xlsx')

    if (!isExcel) {
      return NextResponse.json(
        { error: 'URL did not return an Excel file. In SharePoint, use "Download" and copy that URL, or upload the file directly.' },
        { status: 422 }
      )
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    const priceRows = parseExcel(buffer)
    return NextResponse.json({ priceRows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
