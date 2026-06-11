import { chromium } from 'playwright-core'

const CHROMIUM_DOWNLOAD_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar'

export async function screenshotUrl(url: string): Promise<Buffer> {
  let executablePath: string | undefined
  let args: string[] = []
  if (process.env.NODE_ENV === 'production') {
    const chromiumPkg = await import('@sparticuz/chromium-min')
    executablePath = await chromiumPkg.default.executablePath(CHROMIUM_DOWNLOAD_URL)
    args = chromiumPkg.default.args
  }

  const browser = await chromium.launch({ executablePath, args, headless: true })

  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000) // let JS render
    const buffer = await page.screenshot({ type: 'jpeg', quality: 85 })
    return buffer
  } finally {
    await browser.close()
  }
}
