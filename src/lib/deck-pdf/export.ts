import { launchBrowser } from '@/lib/browser'
import { slideSizeIn } from '@/lib/deck-html/render'

/** Render a full deck HTML document to a PDF (one slide per page). */
export async function deckHtmlToPdf(html: string): Promise<Buffer> {
  const { w, h } = slideSizeIn()
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdf = await page.pdf({
      printBackground: true,
      width: `${w}in`,
      height: `${h}in`,
      preferCSSPageSize: true,
      pageRanges: '', // all pages
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
