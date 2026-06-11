import { NextRequest, NextResponse } from 'next/server'
import { parseExcel } from '@/lib/parse-excel'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('excel') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const priceRows = parseExcel(buffer)
    return NextResponse.json({ priceRows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
