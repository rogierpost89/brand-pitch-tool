import { chromium } from 'playwright-core'

export async function screenshotUrl(url: string): Promise<Buffer> {
  let executablePath: string | undefined
  let args: string[] = []

  if (process.env.NODE_ENV === 'production') {
    const chromiumPkg = await import('@sparticuz/chromium')
    executablePath = await chromiumPkg.default.executablePath()
    args = chromiumPkg.default.args
  }

  const browser = await chromium.launch({
    executablePath,
    args,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    const buffer = await page.screenshot({ type: 'jpeg', quality: 85 })
    return buffer
  } finally {
    await browser.close()
  }
}
