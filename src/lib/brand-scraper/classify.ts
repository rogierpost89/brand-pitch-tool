import type { RawImage, RawPageData } from './types'

const LOGO_HINT = /logo|brandmark|wordmark|^favicon/i
const PRODUCT_HINT = /product|bottle|pack|sku|item/i
const ICON_FILE_HINT = /\.(svg|ico)$/i

/**
 * Pick the brand logo URL.
 *
 * Rules, in priority order:
 *  1. An image whose alt OR filename matches /logo|brandmark|wordmark/.
 *  2. The site's apple-touch-icon (typically the highest-res square logo).
 *  3. The favicon.
 *  4. Empty string if nothing matches.
 *
 * Inline SVG logos are common but cannot be referenced by URL — those are
 * better handled via brand-asset upload in the UI, so we ignore them here.
 */
export function pickLogo(raw: RawPageData): string {
  const named = raw.images.find(
    i => LOGO_HINT.test(i.alt) || LOGO_HINT.test(i.filename),
  )
  if (named) return named.src

  if (raw.appleTouchIcon) return raw.appleTouchIcon
  if (raw.favicon) return raw.favicon
  return ''
}

/**
 * Pick the hero image.
 *
 * Rules, in priority order:
 *  1. og:image — the brand's own declared hero/preview image.
 *  2. twitter:image — same purpose, secondary source.
 *  3. Largest above-the-fold image that isn't an icon or the picked logo.
 *  4. Largest image overall that isn't an icon or the picked logo.
 */
export function pickHero(raw: RawPageData, logoUrl: string): string {
  if (raw.ogImage) return raw.ogImage
  if (raw.twitterImage) return raw.twitterImage

  const candidates = raw.images
    .filter(i => i.src !== logoUrl)
    .filter(i => !ICON_FILE_HINT.test(i.filename))
    .filter(i => !LOGO_HINT.test(i.alt) && !LOGO_HINT.test(i.filename))

  const aboveFold = candidates.filter(i => i.isAboveFold)
  const pool = aboveFold.length > 0 ? aboveFold : candidates
  if (pool.length === 0) return ''
  return pool.slice().sort((a, b) => b.areaPx - a.areaPx)[0].src
}

/**
 * Pick up to N product images.
 *
 * Rules:
 *  - Exclude the picked logo and hero.
 *  - Exclude icon-like files (.svg, .ico).
 *  - Prefer aspect ratio close to 1:1 (between 0.6 and 1.6).
 *  - Prefer alt/filename matching product hint.
 *  - Sort remaining by area descending and take top N.
 *  - Deduplicate by src.
 */
export function pickProducts(
  raw: RawPageData,
  excluded: Set<string>,
  limit = 8,
): string[] {
  const candidates = raw.images
    .filter(i => !excluded.has(i.src))
    .filter(i => !ICON_FILE_HINT.test(i.filename))
    .filter(i => !LOGO_HINT.test(i.alt) && !LOGO_HINT.test(i.filename))
    .filter(i => i.areaPx > 5000) // skip tiny thumbnails

  // Score: aspect closeness + hint match + raw area
  const scored = candidates.map(i => {
    const ratio = i.width > 0 && i.height > 0 ? i.width / i.height : 1
    const aspectScore = ratio >= 0.6 && ratio <= 1.6 ? 1 : 0
    const hintScore = PRODUCT_HINT.test(i.alt) || PRODUCT_HINT.test(i.filename) ? 1 : 0
    return { img: i, score: aspectScore + hintScore, area: i.areaPx }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.area - a.area
  })

  const seen = new Set<string>()
  const out: string[] = []
  for (const s of scored) {
    if (seen.has(s.img.src)) continue
    seen.add(s.img.src)
    out.push(s.img.src)
    if (out.length >= limit) break
  }
  return out
}

/** Extract colors from CSS custom properties on :root. */
export function extractReferenceColors(props: Record<string, string>): string[] {
  const colorRe = /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))$/i
  const out: string[] = []
  for (const v of Object.values(props)) {
    const trimmed = v.trim()
    if (colorRe.test(trimmed) && !out.includes(trimmed)) out.push(trimmed)
    if (out.length >= 8) break
  }
  return out
}

/**
 * Merge images from multiple pages (homepage + product pages) into a single
 * RawImage[]. Deduplicates by absolute src URL; preserves first-seen metadata.
 */
export function mergeImages(images: RawImage[][]): RawImage[] {
  const byUrl = new Map<string, RawImage>()
  for (const list of images) {
    for (const img of list) {
      if (!byUrl.has(img.src)) byUrl.set(img.src, img)
    }
  }
  return Array.from(byUrl.values())
}
