import { describe, it, expect } from 'vitest'
import { deckHtmlToPdf } from './export'

describe('deckHtmlToPdf', () => {
  it('produces a PDF buffer from HTML', async () => {
    const html =
      '<!doctype html><html><body><section class="slide">hello</section></body></html>'
    const pdf = await deckHtmlToPdf(html)
    expect(Buffer.isBuffer(pdf)).toBe(true)
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  }, 60_000)
})
