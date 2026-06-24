import { chromium, type Browser, type Page } from 'playwright'
import type { RawImage, RawPageData, RawSvg } from './types'

const VIEWPORT = { width: 1440, height: 900 }
const NAV_TIMEOUT_MS = 30_000
const SETTLE_TIMEOUT_MS = 5_000

/** Capture raw DOM data from one page. Pure read; never mutates. */
async function capturePage(page: Page, url: string): Promise<RawPageData> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })
  // Best-effort: wait for network to settle so lazy-loaded images appear.
  await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS }).catch(() => {})

  const data = await page.evaluate((viewportH) => {
    const abs = (u: string | null | undefined): string => {
      if (!u) return ''
      try { return new URL(u, document.baseURI).href } catch { return '' }
    }
    const filenameOf = (u: string): string =>
      (u.split('?')[0].split('#')[0].split('/').pop() ?? '').toLowerCase()

    const HEADER_SELECTOR = 'header, [role="banner"], .header, .site-header, #header, #masthead'
    const headers = Array.from(document.querySelectorAll(HEADER_SELECTOR))
    const isInHeader = (el: Element): boolean =>
      headers.some(h => h.contains(el))

    const pickSrcsetLargest = (srcset: string): string => {
      if (!srcset) return ''
      const parts = srcset.split(',').map(s => s.trim())
      let best = ''
      let bestW = 0
      for (const p of parts) {
        const [u, sz] = p.split(/\s+/)
        const w = sz ? parseInt(sz.replace(/[^\d]/g, ''), 10) || 0 : 0
        if (w > bestW) { bestW = w; best = u }
      }
      return abs(best)
    }

    const images = Array.from(document.querySelectorAll('img')).flatMap(el => {
      const src = abs(el.currentSrc || el.src || el.getAttribute('data-src') || '')
      if (!src) return []
      const rect = el.getBoundingClientRect()
      const w = Math.max(el.naturalWidth || 0, Math.round(rect.width))
      const h = Math.max(el.naturalHeight || 0, Math.round(rect.height))
      return [{
        src,
        srcsetLargest: pickSrcsetLargest(el.getAttribute('srcset') || ''),
        alt: el.getAttribute('alt') || '',
        filename: filenameOf(src),
        width: w,
        height: h,
        areaPx: w * h,
        inHeader: isInHeader(el),
        isAboveFold: rect.top < viewportH && rect.top >= -rect.height,
      }]
    })

    const svgs = Array.from(document.querySelectorAll('svg')).slice(0, 30).map(el => ({
      outerHTML: el.outerHTML.length > 4000 ? '' : el.outerHTML,
      ariaLabel: el.getAttribute('aria-label') || el.querySelector('title')?.textContent || '',
      inHeader: isInHeader(el),
    }))

    const meta = (selector: string): string | undefined => {
      const el = document.querySelector(selector) as HTMLMetaElement | null
      return el?.content ? abs(el.content) : undefined
    }
    const link = (rel: string): string | undefined => {
      const el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
      return el?.href ? abs(el.href) : undefined
    }

    const cssCustomProps: Record<string, string> = {}
    const rootStyle = getComputedStyle(document.documentElement)
    // CSSStyleDeclaration is index-based; iterate over its length
    for (let i = 0; i < rootStyle.length; i++) {
      const name = rootStyle.item(i)
      if (name.startsWith('--')) {
        cssCustomProps[name] = rootStyle.getPropertyValue(name).trim()
      }
    }

    const h1 = document.querySelector('h1')
    const h1FontFamily = h1 ? getComputedStyle(h1).fontFamily : ''
    const bodyFontFamily = getComputedStyle(document.body).fontFamily

    const description =
      meta('meta[name="description"]') ||
      meta('meta[property="og:description"]') ||
      ''

    const visibleText = (document.body.innerText || '').slice(0, 3000)

    return {
      title: document.title,
      description,
      visibleText,
      ogImage: meta('meta[property="og:image"]'),
      twitterImage: meta('meta[name="twitter:image"]'),
      favicon: link('icon') || link('shortcut icon'),
      appleTouchIcon: link('apple-touch-icon'),
      images,
      svgs,
      cssCustomProps,
      h1FontFamily,
      bodyFontFamily,
    }
  }, VIEWPORT.height)

  return { url, ...data } satisfies RawPageData
}

/** Pull up to N internal product/shop links from the homepage. */
async function findProductLinks(page: Page, baseHost: string, limit = 5): Promise<string[]> {
  const hrefs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href)
  })
  const matched = hrefs
    .filter(h => {
      try {
        const u = new URL(h)
        if (u.host !== baseHost) return false
        return /\/(product|products|shop|collections|store|range|portfolio)(\/|$)/i.test(u.pathname)
      } catch {
        return false
      }
    })
    // Dedupe while keeping order
    .filter((v, i, arr) => arr.indexOf(v) === i)
  return matched.slice(0, limit)
}

export interface CrawlResult {
  home: RawPageData
  productPages: RawPageData[]
}

export async function crawl(url: string, opts: { productPageLimit?: number } = {}): Promise<CrawlResult> {
  const productPageLimit = opts.productPageLimit ?? 4
  let browser: Browser | null = null
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: VIEWPORT, userAgent: 'Mozilla/5.0 BrandPitchTool/1.0' })
    // tsx/esbuild emits __name(fn, "label") wrappers when --keep-names is on; that helper
    // doesn't exist in the page context, which breaks every page.evaluate. Polyfill it.
    await context.addInitScript(() => {
      // @ts-expect-error: define in page globals before any other script runs
      if (typeof globalThis.__name !== 'function') globalThis.__name = (fn: unknown) => fn
    })
    const page = await context.newPage()

    const home = await capturePage(page, url)
    const baseHost = new URL(url).host
    const productUrls = await findProductLinks(page, baseHost, productPageLimit)

    const productPages: RawPageData[] = []
    for (const purl of productUrls) {
      try {
        productPages.push(await capturePage(page, purl))
      } catch {
        // Skip pages that fail to load — non-fatal.
      }
    }

    return { home, productPages }
  } finally {
    await browser?.close()
  }
}
