import { NextRequest, NextResponse } from 'next/server'
import { translateToNl } from '@/lib/translate'
import type { TranslationMap } from '@/lib/types'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { fields } = await req.json() as { fields: TranslationMap }
    const translated = await translateToNl(fields)
    return NextResponse.json({ translated })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
