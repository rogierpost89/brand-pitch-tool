// src/app/api/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { buildDeckInput, type GenerateRequest } from '@/lib/deck-input'
import { renderDeckHtml } from '@/lib/deck-html/render'
import { deckHtmlToPdf } from '@/lib/deck-pdf/export'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest
    const input = await buildDeckInput(body)
    const pdf = await deckHtmlToPdf(renderDeckHtml(input))
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="pitch-deck.pdf"',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
