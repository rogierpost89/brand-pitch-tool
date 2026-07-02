# HTML Preview + PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pptxgenjs deck generator with a single HTML renderer that powers both an in-app review/edit preview and a Playwright-printed PDF export.

**Architecture:** One pure function `renderDeckHtml(input)` produces a complete self-contained HTML document (inline CSS from `deck-template/tokens.ts`, embedded image data URIs). `/api/generate` returns that HTML for an iframe preview on Step 3; `/api/publish` feeds the same HTML to Playwright's `page.pdf()`. Preview and PDF are byte-identical HTML, so the preview is a faithful proof of the PDF. The pptxgenjs path is retired.

**Tech Stack:** Next.js (App Router) API routes, TypeScript, Vitest, playwright-core + @sparticuz/chromium-min (serverless) / playwright (local).

## Global Constraints

- PDC house style is the ONLY layout. Brand inputs contribute images + copy strings — never colors, fonts, or layout. All styling derives from `src/lib/deck-template/tokens.ts`.
- Token colors are stored as hex WITHOUT a leading `#` (e.g. `F8D418`). CSS must prefix `#`.
- Slide canvas is 16:9, `13.333in × 7.5in`. One slide = one PDF page.
- Font substitutes: display → `Impact, "Arial Black", sans-serif`; body → `"Courier New", monospace`; ui → `"Gill Sans MT", "Gill Sans", "Segoe UI", sans-serif`.
- Reuse the existing serverless/local browser launch strategy from `src/lib/brand-scraper/crawl.ts` (playwright-core + @sparticuz/chromium-min on serverless, `playwright` locally). Chromium pack URL: `https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar`.
- `IS_SERVERLESS` detection must match whatever `crawl.ts` currently uses (see Task 1).
- Test runner: `npx vitest run <path>`.
- Slide count invariant: per brand = 2 (title + brand intro) + 2 × products (product intro + pricing); plus 1 overview slide at the end.

---

### Task 1: Extract shared browser launcher

Pull the `launchBrowser()` helper out of `crawl.ts` into a shared module so the PDF exporter and the scraper use one copy.

**Files:**
- Create: `src/lib/browser.ts`
- Modify: `src/lib/brand-scraper/crawl.ts:1-33`
- Test: `src/lib/browser.test.ts`

**Interfaces:**
- Produces: `export async function launchBrowser(): Promise<import('playwright-core').Browser>` and `export const IS_SERVERLESS: boolean`.

- [ ] **Step 1: Read the current launcher**

Read `src/lib/brand-scraper/crawl.ts` lines 1-33 to capture the exact `IS_SERVERLESS` expression and `launchBrowser` body (already inspected: serverless branch uses `@sparticuz/chromium-min` + `playwright-core`; local branch uses `playwright`).

- [ ] **Step 2: Create `src/lib/browser.ts`**

```ts
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
```

> NOTE: If `crawl.ts`'s current `IS_SERVERLESS` expression differs from the two env checks above, copy `crawl.ts`'s expression verbatim instead.

- [ ] **Step 3: Point `crawl.ts` at the shared launcher**

In `src/lib/brand-scraper/crawl.ts`, delete the local `IS_SERVERLESS` const and the `launchBrowser` function (lines ~18-33 plus its `IS_SERVERLESS` definition), and add near the top:

```ts
import { launchBrowser } from '@/lib/browser'
```

Leave every existing call to `launchBrowser()` untouched.

- [ ] **Step 4: Write the test**

```ts
// src/lib/browser.test.ts
import { describe, it, expect } from 'vitest'
import { IS_SERVERLESS, launchBrowser } from './browser'

describe('browser launcher', () => {
  it('exposes a boolean serverless flag and a launch function', () => {
    expect(typeof IS_SERVERLESS).toBe('boolean')
    expect(typeof launchBrowser).toBe('function')
  })
})
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/lib/browser.test.ts` — Expected: PASS.
Run: `npx tsc --noEmit` — Expected: no errors (confirms `crawl.ts` still compiles against the shared import).

- [ ] **Step 6: Commit**

```bash
git add src/lib/browser.ts src/lib/browser.test.ts src/lib/brand-scraper/crawl.ts
git commit -m "refactor: extract shared launchBrowser into src/lib/browser.ts"
```

---

### Task 2: `renderDeckHtml` — the single-source HTML renderer

Port the exact PDC layout from `deck-composer/index.ts` to an HTML string, using absolute positioning in inches so geometry matches the current deck 1:1.

**Files:**
- Create: `src/lib/deck-html/i18n.ts` (moved from `deck-composer/i18n.ts`)
- Create: `src/lib/deck-html/render.ts`
- Test: `src/lib/deck-html/render.test.ts`

**Interfaces:**
- Consumes: `DeckInput` from `@/lib/deck-template/types`; `colors`, `type`, `slide` from `@/lib/deck-template/tokens`.
- Produces: `export function renderDeckHtml(input: DeckInput): string` — a full `<!doctype html>` document. Also `export function slideSizeIn(): { w: number; h: number }` returning `{ w: 13.333, h: 7.5 }` for the PDF exporter.

- [ ] **Step 1: Move i18n into deck-html**

Copy `src/lib/deck-composer/i18n.ts` verbatim to `src/lib/deck-html/i18n.ts` (exports `t`, `marginLabel`, `marginHeader`, unchanged). Do NOT delete the original yet — Task 7 removes it after the composer is retired.

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/deck-html/render.test.ts
import { describe, it, expect } from 'vitest'
import { renderDeckHtml } from './render'
import type { DeckInput } from '@/lib/deck-template/types'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const SAMPLE: DeckInput = {
  buyer: { company: 'Albert Heijn', contact: 'Jan de Vries' },
  language: 'en',
  marginMode: 'excl',
  pdcLogoDataUri: PNG,
  brands: [
    {
      name: 'La Mundial Barcelona',
      intro: 'Wine-based sparkling, naturally low ABV.',
      description: 'Crafted in the El Born district of Barcelona.',
      images: { logoDataUri: PNG, heroDataUri: PNG },
      products: [
        {
          id: 'p1', name: 'Rosado Spritz', intro: 'Bright and dry.',
          tagline: 'Sunset in a bottle', usps: ['Low ABV', 'Vegan', 'No added sugar'],
          whyItSells: ['On-trend', 'Repeat buyers', 'Great margin'],
          annualVolumeBtl: 12000, imageDataUri: PNG,
          prices: { deliveryPriceExcl: '€3.10', deliveryPriceIncl: '€4.20', rsp: '€7.99', marginExcl: '61%', marginIncl: '47%' },
        },
      ],
    },
  ],
}

describe('renderDeckHtml', () => {
  it('renders one slide section per expected slide', () => {
    const html = renderDeckHtml(SAMPLE)
    // 2 (title + brand intro) + 2 (product intro + pricing) + 1 overview = 5
    const count = (html.match(/class="slide"/g) ?? []).length
    expect(count).toBe(5)
  })

  it('is a complete document with the PDC yellow and embedded images', () => {
    const html = renderDeckHtml(SAMPLE)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('#F8D418')
    expect(html).toContain(PNG)
  })

  it('includes brand, product, and price copy', () => {
    const html = renderDeckHtml(SAMPLE)
    expect(html).toContain('La Mundial Barcelona')
    expect(html).toContain('Rosado Spritz')
    expect(html).toContain('€7.99')
    expect(html).toContain('Sunset in a bottle')
  })

  it('escapes HTML-special characters in copy', () => {
    const evil = { ...SAMPLE, buyer: { company: 'A & B <Ltd>', contact: 'x' } }
    const html = renderDeckHtml(evil)
    expect(html).toContain('A &amp; B &lt;Ltd&gt;')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/deck-html/render.test.ts`
Expected: FAIL — `renderDeckHtml` not found.

- [ ] **Step 4: Write the renderer infrastructure**

Create `src/lib/deck-html/render.ts` starting with the document shell and low-level helpers. Every element is an absolutely-positioned `<div>` whose `left/top/width/height` are the SAME inch values used in `deck-composer/index.ts`, so the layout is a mechanical, faithful port.

```ts
import { colors, type, slide } from '@/lib/deck-template/tokens'
import type { DeckInput, BrandSlot, ProductSlot, Language, MarginMode } from '@/lib/deck-template/types'
import { t, marginLabel, marginHeader } from './i18n'

const { widthIn: W, heightIn: H, accentBarHeightIn: AB, footerHeightIn: FH } = slide

export function slideSizeIn(): { w: number; h: number } {
  return { w: W, h: H }
}

// ---- primitives ----
const esc = (s: string): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const c = (hex: string): string => `#${hex}` // tokens store hex without '#'

/** Map a token face string to a CSS font stack. */
function cssFont(face: string): string {
  if (face === type.displayHero.face) return 'Impact, "Arial Black", sans-serif' // display
  if (face === type.body.face) return '"Courier New", monospace'                 // body
  return '"Gill Sans MT", "Gill Sans", "Segoe UI", sans-serif'                    // ui
}

type Box = { x: number; y: number; w: number; h: number }

function boxStyle(b: Box): string {
  return `position:absolute;left:${b.x}in;top:${b.y}in;width:${b.w}in;height:${b.h}in;`
}

/** A filled/bordered rectangle (pptx addShape('rect')). */
function rect(b: Box, opts: { fill?: string; borderColor?: string; borderPt?: number } = {}): string {
  const fill = opts.fill ? `background:${c(opts.fill)};` : ''
  const border = opts.borderColor ? `border:${opts.borderPt ?? 1}px solid ${c(opts.borderColor)};box-sizing:border-box;` : ''
  return `<div style="${boxStyle(b)}${fill}${border}"></div>`
}

/** An ellipse (pptx addShape('ellipse')). */
function ellipse(b: Box, fill: string): string {
  return `<div style="${boxStyle(b)}background:${c(fill)};border-radius:50%;"></div>`
}

type TextStyle = { size: number; bold?: boolean; italic?: boolean; face: string }
type TextOpts = {
  color: string; align?: 'left' | 'center' | 'right'; valign?: 'top' | 'middle' | 'bottom'
  charSpacing?: number; upper?: boolean
}

/** A positioned text block (pptx addText). charSpacing is in the pptx "px" sense → treat as px letter-spacing. */
function text(content: string, b: Box, ts: TextStyle, o: TextOpts): string {
  const justify = o.valign === 'middle' ? 'center' : o.valign === 'bottom' ? 'flex-end' : 'flex-start'
  const align = o.align ?? 'left'
  const ls = o.charSpacing ? `letter-spacing:${o.charSpacing}px;` : ''
  const weight = ts.bold ? 'font-weight:700;' : 'font-weight:400;'
  const style = ts.italic ? 'font-style:italic;' : ''
  const upper = o.upper ? 'text-transform:uppercase;' : ''
  return (
    `<div style="${boxStyle(b)}display:flex;flex-direction:column;justify-content:${justify};` +
    `font-family:${cssFont(ts.face)};font-size:${ts.size}pt;${weight}${style}${ls}${upper}` +
    `color:${c(o.color)};text-align:${align};line-height:1.15;overflow:hidden;">` +
    `<div>${content}</div></div>`
  )
}

/** An image slot. Empty data URI → soft-gray box, no placeholder text (image is optional now). */
function image(dataUri: string, b: Box, fit: 'cover' | 'contain'): string {
  if (!dataUri || !dataUri.startsWith('data:')) {
    return rect(b, { fill: colors.surfaceSoft, borderColor: colors.hairline, borderPt: 1 })
  }
  return (
    `<img src="${dataUri}" style="${boxStyle(b)}object-fit:${fit};" />`
  )
}
```

- [ ] **Step 5: Port the six slide builders**

Below the primitives, add one function per slide that returns an HTML string for a `<section class="slide">…</section>`. **Port each element from `deck-composer/index.ts` mechanically:** every `s.addShape('rect', {x,y,w,h,fill})` → `rect({x,y,w,h},{fill})`; every `s.addShape('ellipse', …)` → `ellipse(...)`; every `s.addImage`/`safeImage(...)` → `image(dataUri, {x,y,w,h}, sizing)`; every `s.addText(str, {x,y,w,h,fontFace,fontSize,color,bold,italic,align,valign,charSpacing})` → `text(esc(str), {x,y,w,h}, {size:fontSize,bold,italic,face:fontFace}, {color,align,valign,charSpacing})`. Keep the SAME x/y/w/h/color/font/size numbers as the source. Use `esc()` on every dynamic string. The `slide.background` color becomes the section's `background`.

Source map (functions to port, from `deck-composer/index.ts`):
- `addTitleSlide` (`:133-223`) → `titleSlide(input, brand): string` — background `colors.ink`. Includes accent bar, hero image (cover), yellow split line, eyebrow, headline, subtitle, "presented by" + PDC logo (contain) + brand logo (contain), title footer band with buyer/confidential. Multi-run text (e.g. the footer "Pineapple / Drinks Club" two-color runs) → concatenate two `<span>`s with per-span color inside one `text()` call.
- `addBrandIntroSlide` (`:227-275`) → `brandIntroSlide(input, brand)` — background `colors.canvas`; hero (cover) left, about/name/intro/description right; then footer.
- `addProductIntroSlide` (`:279-359`) → `productIntroSlide(input, brand, product)` — gray image panel + product image (contain) + yellow strip; brand eyebrow, product name, tagline, intro; 3 USP cards (each = gray rect + yellow left strip + text); footer.
- `addPricingSlide` (`:363-526`) → `pricingSlide(input, brand, product)` — black top band with product name + right-aligned brand label, bottle panel, RSP yellow card, excl/incl pair cards, margin card, "why it sells" dots list; footer.
- `addOverviewSlide` (`:530-619`) → `overviewSlide(input)` — black header band + title + "NL Market · 2026", then a `<table>` (see Step 6); footer.
- Shared helpers `addAccentBar` (`:48-54`), `addSlideFooter` (`:56-94`) → `accentBar(): string`, `slideFooter(num, total, lang): string` returning HTML fragments composed into each slide.

Each slide function wraps its fragments:

```ts
function section(bg: string, inner: string): string {
  return `<section class="slide" style="background:${c(bg)};">${inner}</section>`
}
```

The footer's page number uses `String(num).padStart(2,'0')` exactly as the source. The pricing slide's brand label is right-aligned via a `text(...)` with `align:'right'` and a box spanning the band width (resolves the source's noted overlap hack cleanly — do NOT reproduce the overlap; use one right-aligned block at `x: W-4-0.6, w: 3.4`).

- [ ] **Step 6: Port the overview table**

`addOverviewSlide` uses `s.addTable`. Render an HTML `<table>` positioned absolutely at the source's `x:0.6, y: headerY+headerH+0.3, w: W-1.2`. Header row: 7 columns (`product`, `brand`, `exclExcise`, `inclExcise`, `rsp`, `marginHeader(mode,lang)`, `annualVolume`) styled with `type.uiMicro`, `colors.muted`, bold, a 2px `colors.primary` bottom border. Body rows iterate `input.brands.flatMap(b => b.products)`; product name cell bold+italic `colors.ink` (ui font), brand cell `colors.muted`, price cells `type.body` size 10 `colors.mutedLink`, RSP cell bold `colors.ink`, margin cell = `mode==='excl'?marginExcl:marginIncl` with `colors.primary` background + `colors.ink` bold centered, volume cell `p.annualVolumeBtl.toLocaleString('en-US')` bold `colors.ink`. Column widths mirror the source `colW` ratios (`[0.22,0.16,0.12,0.12,0.12,0.13,0.13]` of `tableW`). Each body cell has a `colors.thinDivider` bottom border.

- [ ] **Step 7: Assemble the document**

```ts
export function renderDeckHtml(input: DeckInput): string {
  const totalSlides =
    input.brands.reduce((sum, b) => sum + 2 + b.products.length * 2, 0) + 1
  let n = 1
  const sections: string[] = []
  for (const brand of input.brands) {
    sections.push(titleSlide(input, brand, n++, totalSlides))
    sections.push(brandIntroSlide(input, brand, n++, totalSlides))
    for (const product of brand.products) {
      sections.push(productIntroSlide(input, brand, product, n++, totalSlides))
      sections.push(pricingSlide(input, brand, product, n++, totalSlides))
    }
  }
  sections.push(overviewSlide(input, n++, totalSlides))

  const css = `
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: ${W}in ${H}in; margin: 0; }
    html, body { background:#fff; }
    .slide {
      position: relative;
      width: ${W}in; height: ${H}in;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .slide:last-child { page-break-after: auto; break-after: auto; }
    img { display:block; }
  `
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<title>Pitch Deck — ${esc(input.brands.map(b => b.name).join(' · '))}</title>` +
    `<style>${css}</style></head><body>${sections.join('')}</body></html>`
  )
}
```

> Pass `num`/`total` through each slide builder's signature (they call `slideFooter`). Update the signatures in Step 5 accordingly: `titleSlide(input, brand, num, total)` etc. The title slide has its own footer band and ignores `num/total` (as in the source).

- [ ] **Step 8: Run the tests**

Run: `npx vitest run src/lib/deck-html/render.test.ts`
Expected: PASS (all 4 tests).
Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/deck-html/
git commit -m "feat: renderDeckHtml — PDC deck as a single HTML document"
```

---

### Task 3: `deckHtmlToPdf` — print HTML to PDF with Playwright

**Files:**
- Create: `src/lib/deck-pdf/export.ts`
- Test: `src/lib/deck-pdf/export.test.ts`

**Interfaces:**
- Consumes: `launchBrowser` from `@/lib/browser`; `slideSizeIn` from `@/lib/deck-html/render`.
- Produces: `export async function deckHtmlToPdf(html: string): Promise<Buffer>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/deck-pdf/export.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/deck-pdf/export.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the exporter**

```ts
// src/lib/deck-pdf/export.ts
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
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/deck-pdf/export.test.ts`
Expected: PASS. (Requires a local Chromium via `playwright`. If Chromium is missing locally, run `npx playwright install chromium` first.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/deck-pdf/
git commit -m "feat: deckHtmlToPdf — print deck HTML to PDF via Playwright"
```

---

### Task 4: Shared `DeckInput` builder

Extract the request-body → `DeckInput` logic (image fetching + override wiring) currently inline in `/api/generate` so both `/api/generate` and `/api/publish` build input identically.

**Files:**
- Create: `src/lib/deck-input.ts`
- Test: `src/lib/deck-input.test.ts`
- Reference: `src/app/api/generate/route.ts:13-113`

**Interfaces:**
- Consumes: `imageToDataUri` from `@/lib/image-embed`; types from `@/lib/deck-template/types` and `@/lib/types`.
- Produces:
  - `export interface GenerateRequest { deckData: { buyer: {company:string;contact:string}; language: Language; marginMode?: MarginMode; brands: IncomingBrand[] }; translationOverrides?: Record<string,string> }`
  - `export interface IncomingBrand { name:string; intro:string; assets: BrandAssets; products: IncomingProduct[] }`
  - `export interface IncomingProduct extends ExtractedProduct { prices: {deliveryPriceExcl:string;deliveryPriceIncl:string;rsp:string;marginExcl:string;marginIncl:string}; imageOverrideDataUri?: string }`
  - `export const PDC_LOGO_URL: string`
  - `export async function buildDeckInput(body: GenerateRequest): Promise<DeckInput>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/deck-input.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/image-embed', () => ({
  imageToDataUri: vi.fn(async (url: string) => (url ? `data:image/png;base64,${btoa(url)}` : '')),
}))

import { buildDeckInput } from './deck-input'

describe('buildDeckInput', () => {
  it('maps request body into a DeckInput with fetched image data URIs', async () => {
    const input = await buildDeckInput({
      deckData: {
        buyer: { company: 'AH', contact: 'Jan' },
        language: 'en',
        marginMode: 'incl',
        brands: [{
          name: 'B', intro: 'i',
          assets: { logoUrl: 'http://logo', heroImageUrl: 'http://hero', productImageUrls: [], description: 'd' },
          products: [{
            id: 'p1', name: 'P', intro: 'pi', tagline: 'tg', usps: [], why_it_sells: [],
            annual_volume_btl: 5, image_url: 'http://img',
            prices: { deliveryPriceExcl: '1', deliveryPriceIncl: '2', rsp: '3', marginExcl: '4', marginIncl: '5' },
          }],
        }],
      },
    })
    expect(input.marginMode).toBe('incl')
    expect(input.brands[0].images.logoDataUri).toContain('data:image/png')
    expect(input.brands[0].products[0].imageDataUri).toContain('data:image/png')
    expect(input.pdcLogoDataUri).toContain('data:image/png')
  })

  it('defaults marginMode to excl and applies translation overrides', async () => {
    const input = await buildDeckInput({
      deckData: {
        buyer: { company: 'AH', contact: 'Jan' }, language: 'nl',
        brands: [{
          name: 'B', intro: 'i',
          assets: { logoUrl: '', heroImageUrl: '', productImageUrls: [], description: 'd' },
          products: [{
            id: 'p1', name: 'P', intro: 'orig', tagline: 'tg', usps: [], why_it_sells: [],
            annual_volume_btl: 0, image_url: '',
            prices: { deliveryPriceExcl: '', deliveryPriceIncl: '', rsp: '', marginExcl: '', marginIncl: '' },
          }],
        }],
      },
      translationOverrides: { 'intro_0_p1': 'translated' },
    })
    expect(input.marginMode).toBe('excl')
    expect(input.brands[0].products[0].intro).toBe('translated')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/deck-input.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement by moving logic out of the route**

Create `src/lib/deck-input.ts`. Move `PDC_LOGO_URL`, the `IncomingProduct`/`IncomingBrand`/`GenerateRequest` interfaces, the `applyOverride` helper, and the whole body-mapping block from `route.ts:47-113` into an exported `buildDeckInput(body: GenerateRequest): Promise<DeckInput>`. It must reproduce the existing behavior exactly: `marginMode ?? 'excl'`; fetch `pdcLogoDataUri` via `imageToDataUri(PDC_LOGO_URL)`; per brand fetch logo+hero (`.catch(() => '')`); per product use `imageOverrideDataUri || (image_url && imageToDataUri(image_url).catch(()=>''))`; apply `translationOverrides` with keys `intro_{bi}_{id}`, `tagline_{bi}_{id}`, `usp_{i}_{bi}_{id}`, `why_{i}_{bi}_{id}`. Return the assembled `DeckInput`.

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/deck-input.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deck-input.ts src/lib/deck-input.test.ts
git commit -m "refactor: extract buildDeckInput shared by generate + publish"
```

---

### Task 5: Rewire the API routes

`/api/generate` returns HTML for preview; new `/api/publish` returns the PDF.

**Files:**
- Modify: `src/app/api/generate/route.ts` (replace body)
- Create: `src/app/api/publish/route.ts`

**Interfaces:**
- Consumes: `buildDeckInput`, `GenerateRequest` from `@/lib/deck-input`; `renderDeckHtml` from `@/lib/deck-html/render`; `deckHtmlToPdf` from `@/lib/deck-pdf/export`.

- [ ] **Step 1: Replace `/api/generate`**

```ts
// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { buildDeckInput, type GenerateRequest } from '@/lib/deck-input'
import { renderDeckHtml } from '@/lib/deck-html/render'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest
    const input = await buildDeckInput(body)
    const html = renderDeckHtml(input)
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Create `/api/publish`**

```ts
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
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` — Expected: no errors (both routes resolve their imports; `route.ts` no longer imports `composeDeck` or `pptxgenjs`).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate/route.ts src/app/api/publish/route.ts
git commit -m "feat: /api/generate returns preview HTML, /api/publish returns PDF"
```

---

### Task 6: Step 3 preview + Publish button

**Files:**
- Modify: `src/app/step3/page.tsx` (the `generate` function `:150-228` and the button block `:413-419`, plus new preview panel + heading copy `:236-241`)

**Interfaces:**
- Consumes: `POST /api/generate` (returns `text/html`), `POST /api/publish` (returns `application/pdf`).

- [ ] **Step 1: Read the current generate handler and state**

Read `src/app/step3/page.tsx:120-228` to capture the exact `brands`/`overrides` payload the current `generate()` builds. Both new handlers reuse that identical payload construction (`{ deckData: { buyer, language, marginMode, brands }, translationOverrides: overrides }`).

- [ ] **Step 2: Add preview state + helpers**

Near the other `useState` hooks add:

```tsx
const [previewHtml, setPreviewHtml] = useState<string>('')
const [previewing, setPreviewing] = useState(false)
```

Extract the payload building (the `brands` array + `overrides`) from `generate()` into a local helper so both preview and publish reuse it:

```tsx
function buildPayload() {
  // ...move the existing `brands` mapping (lines ~150-203) and `overrides` here...
  return { deckData: { buyer: state.buyer, language: state.language, marginMode, brands }, translationOverrides: overrides }
}
```

- [ ] **Step 3: Replace `generate()` with `refreshPreview()` + `publish()`**

```tsx
async function refreshPreview() {
  setError(''); setPreviewing(true)
  try {
    const res = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })
    if (!res.ok) { setError((await res.json()).error); return }
    setPreviewHtml(await res.text())
  } finally { setPreviewing(false) }
}

async function publish() {
  setError(''); setGenerating(true)
  try {
    const res = await fetch('/api/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })
    if (!res.ok) { setError((await res.json()).error); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pitch-deck.pdf'
    a.click()
    URL.revokeObjectURL(a.href)
  } finally { setGenerating(false) }
}
```

- [ ] **Step 4: Update heading + add preview panel**

Change the Step 3 heading/subtitle (`:236-241`) to:

```tsx
<h1 className="text-2xl font-black italic uppercase tracking-tight mb-1">
  Step 3 — Review &amp; Publish
</h1>
<p className="text-xs text-zinc-500 font-mono mb-8">
  Edit product data below, refresh the preview, then publish the PDF.
</p>
```

Above the price grid (or directly under it), add the preview panel:

```tsx
<div className="mb-8">
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs font-bold tracking-[2px] uppercase text-zinc-600">Deck Preview</span>
    <button
      className="text-xs text-zinc-600 hover:text-[#f8d418] font-mono border border-zinc-800 px-3 py-1 disabled:opacity-50"
      onClick={refreshPreview} disabled={previewing}
    >
      {previewing ? 'Rendering…' : '↻ Refresh preview'}
    </button>
  </div>
  {previewHtml ? (
    <iframe
      title="Deck preview"
      srcDoc={previewHtml}
      className="w-full border border-zinc-800 bg-white"
      style={{ aspectRatio: '13.333 / 7.5', height: 'auto' }}
    />
  ) : (
    <div className="border border-dashed border-zinc-800 text-zinc-600 text-xs font-mono p-8 text-center">
      Click “Refresh preview” to render the deck.
    </div>
  )}
</div>
```

> The iframe shows the full multi-slide document scrolled vertically (each slide is 7.5in tall). This is acceptable for review. No pagination UI (YAGNI).

- [ ] **Step 5: Replace the generate button**

Change the button at `:413-419` to call `publish`:

```tsx
<button
  onClick={publish}
  disabled={generating || translating}
  /* keep existing className */
>
  {generating ? 'Publishing…' : 'Publish PDF →'}
</button>
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run lint` (if present) — Expected: no new errors. (Confirm no leftover `pitch-deck.pptx` / `composeDeck` references remain in `page.tsx`.)

- [ ] **Step 7: Commit**

```bash
git add src/app/step3/page.tsx
git commit -m "feat: Step 3 iframe preview + Publish PDF button"
```

---

### Task 7: Retire the pptxgenjs composer

**Files:**
- Delete: `src/lib/deck-composer/index.ts`, `src/lib/deck-composer/index.test.ts`, `src/lib/deck-composer/i18n.ts`
- Modify: `src/lib/e2e.test.ts`
- Reference: grep for stragglers

- [ ] **Step 1: Confirm nothing else imports the composer**

Run: `grep -rn "deck-composer\|composeDeck\|pptxgenjs" src/` — Expected after Tasks 2-6: only `src/lib/deck-composer/*` and `src/lib/e2e.test.ts` still reference them. If any OTHER file does, fix it before deleting.

- [ ] **Step 2: Delete the composer directory**

```bash
git rm src/lib/deck-composer/index.ts src/lib/deck-composer/index.test.ts src/lib/deck-composer/i18n.ts
```

- [ ] **Step 3: Update `e2e.test.ts`**

Read `src/lib/e2e.test.ts`. Replace any `composeDeck(...)` call + pptx assertions with the HTML pipeline. Minimal change: import `renderDeckHtml` from `@/lib/deck-html/render` and assert the returned string `startsWith('<!doctype html>')` and contains a known brand name. Remove the pptx buffer/`PptxGenJS` assertions. If the test also exercised image embedding, assert the data URI appears in the HTML instead.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run` — Expected: PASS (no references to the deleted files remain).
Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: retire pptxgenjs composer; PDF is the only output"
```

---

## Verification (whole feature)

- [ ] `npx vitest run` — all green.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run dev`, walk Step 1 → 2 → 3, click **Refresh preview** → deck renders with images fitted (no "PASTE IMAGE" boxes), click **Publish PDF** → `pitch-deck.pdf` downloads and opens with correct slides.
- [ ] `git grep -n pptx` — no functional references remain (package.json dep may stay).

## Self-review notes

- Spec coverage: renderer (T2), PDF export (T3), shared browser (T1), shared input (T4), routes (T5), UI preview+publish (T6), retire pptx (T7) — all spec sections mapped.
- Global constraint on token colors (`#` prefix) enforced via `c()` helper in T2.
- Type consistency: `GenerateRequest`/`buildDeckInput` defined in T4 and consumed verbatim in T5; `renderDeckHtml`/`slideSizeIn` defined in T2 and consumed in T3/T5.
- Fidelity: slide geometry is a 1:1 numeric port of `deck-composer/index.ts`; the only intentional deviation is fixing the pricing-slide brand-label overlap hack (T2 Step 5).
