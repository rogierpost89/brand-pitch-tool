import type { Browser } from 'playwright-core'

/** True on Vercel / Lambda, where we must use the @sparticuz chromium binary. */
export const IS_SERVERLESS =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

const CHROMIUM_PACK =
  'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar'

/**
 * Launch a headless Chromium.
 *  - Serverless: playwright-core + @sparticuz/chromium-min (no bundled binary).
 *  - Local dev: the full `playwright` package (ships its own binary).
 * Shared by the brand scraper and the deck PDF exporter.
 */
export async function launchBrowser(): Promise<Browser> {
  if (IS_SERVERLESS) {
    const sparticuz = (await import('@sparticuz/chromium-min')).default
    const { chromium } = await import('playwright-core')
    const executablePath = await sparticuz.executablePath(CHROMIUM_PACK)
    return chromium.launch({
      args: sparticuz.args,
      executablePath,
      headless: true,
    })
  }
  const { chromium } = await import('playwright')
  return chromium.launch({ headless: true }) as unknown as Promise<Browser>
}
