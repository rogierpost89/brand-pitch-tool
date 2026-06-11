# Brand Pitch Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-step Next.js web app that generates self-contained HTML pitch decks from brand URLs, brand.yaml, and a value-chain Excel file.

**Architecture:** Next.js 14 App Router with four API routes (analyse-brand, parse-files, translate, generate). State passes between the three UI steps via `sessionStorage`. Output is a single downloadable HTML file with all images base64-embedded and an EN/NL client-side toggle.

**Tech Stack:** Next.js 14 (App Router), TypeScript, `@anthropic-ai/sdk`, `playwright-core` + `@sparticuz/chromium`, `js-yaml`, `xlsx`, Vitest, Tailwind CSS, deployed on Vercel.

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (dark PDC theme)
│   ├── page.tsx                    # Step 1: Brand URL analysis
│   ├── step2/page.tsx              # Step 2: Upload brand.yaml + Excel
│   ├── step3/page.tsx              # Step 3: Translation review + download
│   └── api/
│       ├── analyse-brand/route.ts  # POST: screenshot + Claude Vision → BrandAssets
│       ├── parse-files/route.ts    # POST: parse brand.yaml + xlsx → structured data
│       ├── translate/route.ts      # POST: Claude EN→NL translation
│       └── generate/route.ts       # POST: embed images + assemble HTML deck
├── lib/
│   ├── types.ts                    # All shared TypeScript types
│   ├── parse-yaml.ts               # brand.yaml string → YamlInput
│   ├── parse-excel.ts              # xlsx Buffer → PriceRow[]
│   ├── image-embed.ts              # image URL → base64 data URI
│   ├── screenshot.ts               # Playwright: URL → JPEG Buffer
│   ├── vision.ts                   # Claude Vision: screenshot → BrandAssets
│   ├── translate.ts                # Claude: TranslationMap EN → NL
│   └── generate-deck.ts            # DeckData → self-contained HTML string
└── templates/
    └── slides.ts                   # Slide builder functions → HTML strings
```

---

## Task 1: Bootstrap Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.env.local.example`, `tailwind.config.ts`, `postcss.config.js`

- [ ] **Step 1: Scaffold project**

```bash
cd /Users/newnew/Developer/brand-pitch-tool
npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk js-yaml xlsx playwright-core @sparticuz/chromium
npm install --save-dev @types/js-yaml vitest @vitest/coverage-v8
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create .env.local.example**

```bash
cat > .env.local.example << 'EOF'
ANTHROPIC_API_KEY=sk-ant-...
EOF
cp .env.local.example .env.local
```

Then add your real `ANTHROPIC_API_KEY` to `.env.local`.

- [ ] **Step 5: Create src/ directory structure**

```bash
mkdir -p src/app/step2 src/app/step3 src/app/api/analyse-brand src/app/api/parse-files src/app/api/translate src/app/api/generate src/lib src/templates
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at http://localhost:3000 with default Next.js page.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js project with dependencies"
```

---

## Task 2: Shared TypeScript types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write types**

Create `src/lib/types.ts`:
```typescript
export interface Product {
  id: string
  name: string
  intro: string
  tagline: string
  usps: string[]
  why_it_sells: string[]
  annual_volume_btl: number
  image_url: string
}

export interface BrandData {
  name: string
  url: string
  intro: string
  products: Product[]
}

export interface Buyer {
  company: string
  contact: string
}

export interface YamlInput {
  buyer: Buyer
  brands: BrandData[]
}

export interface PriceRow {
  productId: string
  brandName: string
  deliveryPrice: string
  rsp: string
  margin: string
}

export interface BrandAssets {
  logoUrl: string
  heroImageUrl: string
  productImageUrls: string[]
  description: string
}

// After image embedding: all URLs replaced with data URIs
export interface BrandAssetsEmbedded {
  logoDataUri: string
  heroDataUri: string
  productDataUris: string[]
  description: string
}

export interface PriceData {
  deliveryPrice: string
  rsp: string
  margin: string
}

export interface DeckProduct extends Product {
  imageDataUri: string
  prices: PriceData
}

export interface DeckBrand {
  name: string
  intro: string
  assets: BrandAssetsEmbedded
  products: DeckProduct[]
}

export interface DeckData {
  buyer: Buyer
  brands: DeckBrand[]
  language: 'en' | 'nl'
}

export type TranslationMap = Record<string, string>

// Per-product text fields that can be translated
export interface ProductTextFields {
  tagline: string
  intro: string
  usps: string[]
  why_it_sells: string[]
}

export interface TranslatableFields {
  [brandIdx_productId: string]: ProductTextFields
  // key format: "0_clarea", "1_rosso" etc.
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: YAML parser

**Files:**
- Create: `src/lib/parse-yaml.ts`
- Test: `src/lib/parse-yaml.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/parse-yaml.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseBrandYaml } from './parse-yaml'

const VALID_YAML = `
buyer:
  company: "Albert Heijn"
  contact: "Jan de Vries"
brands:
  - name: "La Mundial Barcelona"
    url: "https://lamundialbarcelona.com"
    intro: "Wine-based sparkling."
    products:
      - id: clarea
        name: "Clarea"
        intro: "Peach sparkling."
        tagline: "Escape the ordinary"
        usps:
          - "Fine bubbles"
        why_it_sells:
          - "New category"
        annual_volume_btl: 2400
        image_url: ""
`

describe('parseBrandYaml', () => {
  it('parses a valid brand.yaml', () => {
    const result = parseBrandYaml(VALID_YAML)
    expect(result.buyer.company).toBe('Albert Heijn')
    expect(result.brands).toHaveLength(1)
    expect(result.brands[0].products).toHaveLength(1)
    expect(result.brands[0].products[0].id).toBe('clarea')
  })

  it('throws when buyer is missing', () => {
    expect(() => parseBrandYaml('brands: []')).toThrow('buyer')
  })

  it('throws when brands is missing', () => {
    expect(() => parseBrandYaml('buyer:\n  company: AH\n  contact: Jan')).toThrow('brands')
  })

  it('parses multiple brands', () => {
    const yaml = VALID_YAML + `
  - name: "Roots Divino"
    url: "https://finestroots.com"
    intro: "0% aperitifs."
    products:
      - id: rosso
        name: "Aperitif Rosso"
        intro: "Bittersweet."
        tagline: "Back to the roots"
        usps: ["Double Gold"]
        why_it_sells: ["No-alc trend"]
        annual_volume_btl: 1200
        image_url: ""
`
    const result = parseBrandYaml(yaml)
    expect(result.brands).toHaveLength(2)
    expect(result.brands[1].name).toBe('Roots Divino')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/parse-yaml.test.ts
```

Expected: FAIL — `parseBrandYaml` not defined.

- [ ] **Step 3: Write implementation**

Create `src/lib/parse-yaml.ts`:
```typescript
import yaml from 'js-yaml'
import type { YamlInput } from './types'

export function parseBrandYaml(content: string): YamlInput {
  const parsed = yaml.load(content) as Record<string, unknown>

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML: expected an object')
  }
  if (!parsed.buyer) {
    throw new Error('brand.yaml missing required field: buyer')
  }
  if (!parsed.brands) {
    throw new Error('brand.yaml missing required field: brands')
  }

  return parsed as YamlInput
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/lib/parse-yaml.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/parse-yaml.ts src/lib/parse-yaml.test.ts
git commit -m "feat: add YAML parser with tests"
```

---

## Task 4: Excel parser

**Files:**
- Create: `src/lib/parse-excel.ts`
- Test: `src/lib/parse-excel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/parse-excel.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExcel } from './parse-excel'

function buildWorkbook(rows: (string | number)[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

const SAMPLE_ROWS = [
  ['Brand Name', 'La Mundial', 'Roots Divino'],
  ['Product / SKU', 'clarea', 'rosso'],
  ['Direct Delivery Price to retailer (incl.excise)', '€8.50', '€9.50'],
  ['CONSUMER RSP (incl.excise + VAT)', '€17.95', '€19.95'],
  ['Off-trade retail margin %', '28%', '30%'],
]

describe('parseExcel', () => {
  it('parses two products from sample workbook', () => {
    const buf = buildWorkbook(SAMPLE_ROWS)
    const rows = parseExcel(buf)
    expect(rows).toHaveLength(2)
    expect(rows[0].productId).toBe('clarea')
    expect(rows[0].deliveryPrice).toBe('€8.50')
    expect(rows[0].rsp).toBe('€17.95')
    expect(rows[0].margin).toBe('28%')
    expect(rows[1].productId).toBe('rosso')
    expect(rows[1].brandName).toBe('Roots Divino')
  })

  it('throws when a required row label is missing', () => {
    const incompleteRows = SAMPLE_ROWS.slice(0, 3) // missing RSP and margin rows
    const buf = buildWorkbook(incompleteRows)
    expect(() => parseExcel(buf)).toThrow('Missing rows')
  })

  it('skips empty product columns', () => {
    const rowsWithEmpty = [
      ['Brand Name', 'La Mundial', '', 'Roots Divino'],
      ['Product / SKU', 'clarea', '', 'rosso'],
      ['Direct Delivery Price to retailer (incl.excise)', '€8.50', '', '€9.50'],
      ['CONSUMER RSP (incl.excise + VAT)', '€17.95', '', '€19.95'],
      ['Off-trade retail margin %', '28%', '', '30%'],
    ]
    const buf = buildWorkbook(rowsWithEmpty)
    const rows = parseExcel(buf)
    expect(rows).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/parse-excel.test.ts
```

Expected: FAIL — `parseExcel` not defined.

- [ ] **Step 3: Write implementation**

Create `src/lib/parse-excel.ts`:
```typescript
import * as XLSX from 'xlsx'
import type { PriceRow } from './types'

const ROW_LABELS: Record<keyof Omit<PriceRow, 'productId'> | 'productId', string> = {
  brandName: 'Brand Name',
  productId: 'Product / SKU',
  deliveryPrice: 'Direct Delivery Price to retailer (incl.excise)',
  rsp: 'CONSUMER RSP (incl.excise + VAT)',
  margin: 'Off-trade retail margin %',
}

export function parseExcel(buffer: Buffer): PriceRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][]

  const labelRowIndex: Partial<Record<keyof typeof ROW_LABELS, number>> = {}

  rows.forEach((row, i) => {
    const cellA = String(row[0] ?? '').trim().toLowerCase()
    if (!cellA) return
    for (const [key, label] of Object.entries(ROW_LABELS)) {
      if (cellA.includes(label.toLowerCase())) {
        labelRowIndex[key as keyof typeof ROW_LABELS] = i
      }
    }
  })

  const missing = Object.keys(ROW_LABELS).filter(
    k => labelRowIndex[k as keyof typeof ROW_LABELS] === undefined
  )
  if (missing.length > 0) {
    throw new Error(`Missing rows in Excel: ${missing.join(', ')}`)
  }

  const productIdRow = rows[labelRowIndex.productId!]
  const results: PriceRow[] = []

  for (let col = 1; col < productIdRow.length; col++) {
    const productId = String(productIdRow[col] ?? '').trim()
    if (!productId) continue

    results.push({
      productId,
      brandName: String(rows[labelRowIndex.brandName!]?.[col] ?? '').trim(),
      deliveryPrice: String(rows[labelRowIndex.deliveryPrice!]?.[col] ?? '').trim(),
      rsp: String(rows[labelRowIndex.rsp!]?.[col] ?? '').trim(),
      margin: String(rows[labelRowIndex.margin!]?.[col] ?? '').trim(),
    })
  }

  return results
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/lib/parse-excel.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/parse-excel.ts src/lib/parse-excel.test.ts
git commit -m "feat: add Excel parser with row-label lookup and tests"
```

---

## Task 5: Image embed utility

**Files:**
- Create: `src/lib/image-embed.ts`
- Test: `src/lib/image-embed.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/image-embed.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { imageToDataUri } from './image-embed'

const FAKE_IMAGE = Buffer.from('fakeimagebytes')
const FAKE_B64 = FAKE_IMAGE.toString('base64')

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('imageToDataUri', () => {
  it('returns a data URI with correct content-type', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => h === 'content-type' ? 'image/png' : null },
      arrayBuffer: async () => FAKE_IMAGE.buffer,
    } as unknown as Response)

    const result = await imageToDataUri('https://example.com/logo.png')
    expect(result).toBe(`data:image/png;base64,${FAKE_B64}`)
  })

  it('sends a Mozilla User-Agent header to bypass hotlink protection', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => FAKE_IMAGE.buffer,
    } as unknown as Response)
    global.fetch = mockFetch

    await imageToDataUri('https://example.com/img.jpg')
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect((opts.headers as Record<string, string>)['User-Agent']).toMatch(/Mozilla/)
  })

  it('throws on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    } as unknown as Response)

    await expect(imageToDataUri('https://example.com/blocked.png')).rejects.toThrow('403')
  })

  it('falls back to image/jpeg when content-type header is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      arrayBuffer: async () => FAKE_IMAGE.buffer,
    } as unknown as Response)

    const result = await imageToDataUri('https://example.com/img')
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/image-embed.test.ts
```

Expected: FAIL — `imageToDataUri` not defined.

- [ ] **Step 3: Write implementation**

Create `src/lib/image-embed.ts`:
```typescript
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function imageToDataUri(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch image ${url}: ${res.status}`)
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = await res.arrayBuffer()
  const b64 = Buffer.from(buffer).toString('base64')

  return `data:${contentType};base64,${b64}`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/lib/image-embed.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/image-embed.ts src/lib/image-embed.test.ts
git commit -m "feat: add image-embed utility with UA bypass and tests"
```

---

## Task 6: Slide HTML templates

**Files:**
- Create: `src/templates/slides.ts`
- Test: `src/templates/slides.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/templates/slides.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  titleSlide,
  brandIntroSlide,
  productIntroSlide,
  pricingSlide,
  overviewSlide,
} from './slides'
import type { DeckBrand, DeckProduct } from '@/lib/types'

const MOCK_ASSETS = {
  logoDataUri: 'data:image/svg+xml;base64,abc',
  heroDataUri: 'data:image/jpeg;base64,def',
  productDataUris: ['data:image/png;base64,ghi'],
  description: 'A great brand.',
}

const MOCK_PRODUCT: DeckProduct = {
  id: 'clarea',
  name: 'Clarea',
  intro: 'Peach sparkling wine.',
  tagline: 'Escape the ordinary',
  usps: ['Fine bubbles', 'Locally grown'],
  why_it_sells: ['New category', 'Golden colour'],
  annual_volume_btl: 2400,
  image_url: '',
  imageDataUri: 'data:image/png;base64,ghi',
  prices: { deliveryPrice: '€8.50', rsp: '€17.95', margin: '28%' },
}

const MOCK_BRAND: DeckBrand = {
  name: 'La Mundial Barcelona',
  intro: 'Wine-based sparkling beverages from Barcelona.',
  assets: MOCK_ASSETS,
  products: [MOCK_PRODUCT],
}

describe('titleSlide', () => {
  it('contains brand name as h1', () => {
    const html = titleSlide({
      brandName: 'La Mundial Barcelona',
      subtitle: 'Wine-based sparkling from Barcelona.',
      heroImageUri: MOCK_ASSETS.heroDataUri,
      pdcLogoUri: 'data:image/png;base64,pdc',
      brandLogoUri: MOCK_ASSETS.logoDataUri,
      buyerCompany: 'Albert Heijn',
      buyerContact: 'Jan de Vries',
      slideNum: 1,
      totalSlides: 6,
    })
    expect(html).toContain('La Mundial Barcelona')
    expect(html).toContain('s-title')
    expect(html).toContain('accent-bar')
    expect(html).toContain('Albert Heijn')
    expect(html).toContain('data-en=')
    expect(html).toContain('data-nl=')
  })
})

describe('brandIntroSlide', () => {
  it('contains brand intro text and hero image', () => {
    const html = brandIntroSlide({
      brand: MOCK_BRAND,
      slideNum: 2,
      totalSlides: 6,
    })
    expect(html).toContain('s-brand-intro')
    expect(html).toContain('Wine-based sparkling beverages from Barcelona.')
    expect(html).toContain(MOCK_ASSETS.heroDataUri)
  })
})

describe('productIntroSlide', () => {
  it('contains product name, USPs, and brand label', () => {
    const html = productIntroSlide({
      brandName: 'La Mundial Barcelona',
      product: MOCK_PRODUCT,
      slideNum: 3,
      totalSlides: 6,
    })
    expect(html).toContain('s-product')
    expect(html).toContain('Clarea')
    expect(html).toContain('Fine bubbles')
    expect(html).toContain('La Mundial Barcelona')
  })
})

describe('pricingSlide', () => {
  it('contains all three price cards with RSP highlighted', () => {
    const html = pricingSlide({
      brandName: 'La Mundial Barcelona',
      product: MOCK_PRODUCT,
      slideNum: 4,
      totalSlides: 6,
    })
    expect(html).toContain('s-pricing')
    expect(html).toContain('€8.50')
    expect(html).toContain('€17.95')
    expect(html).toContain('28%')
    expect(html).toContain('pcard hl') // RSP highlighted card
    expect(html).toContain('New category')
  })
})

describe('overviewSlide', () => {
  it('contains brand column and all products', () => {
    const html = overviewSlide({
      brands: [MOCK_BRAND],
      slideNum: 5,
      totalSlides: 5,
    })
    expect(html).toContain('s-overview')
    expect(html).toContain('La Mundial Barcelona')
    expect(html).toContain('Clarea')
    expect(html).toContain('€17.95')
    expect(html).toContain('mpill') // margin pill
    expect(html).toContain('2,400') // annual volume formatted
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/templates/slides.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/templates/slides.ts`:
```typescript
import type { DeckBrand, DeckProduct } from '@/lib/types'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function slideFooter(slideNum: number, totalSlides: number): string {
  return `<div class="slide-footer">
    <span class="sf-brand">Pineapple <span>Drinks Club</span></span>
    <span class="sf-num">${String(slideNum).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}</span>
  </div>`
}

export function titleSlide(opts: {
  brandName: string
  subtitle: string
  heroImageUri: string
  pdcLogoUri: string
  brandLogoUri: string
  buyerCompany: string
  buyerContact: string
  slideNum: number
  totalSlides: number
}): string {
  return `<div class="slide s-title">
  <div class="accent-bar"></div>
  <div class="left">
    <div>
      <div class="eyebrow"
        data-en="Product Pitch · NL Market · 2026"
        data-nl="Productpresentatie · NL Markt · 2026">Product Pitch · NL Market · 2026</div>
      <h1>${escHtml(opts.brandName)}</h1>
      <div class="subtitle"
        data-en="${escHtml(opts.subtitle)}"
        data-nl="${escHtml(opts.subtitle)}">${escHtml(opts.subtitle)}</div>
    </div>
    <div class="logo-row">
      <div>
        <div class="logo-label">Presented by</div>
        <img class="pdc-logo" src="${opts.pdcLogoUri}" alt="Pineapple Drinks Club" />
      </div>
      <img class="brand-logo" src="${opts.brandLogoUri}" alt="${escHtml(opts.brandName)}" />
    </div>
  </div>
  <div class="right"><img src="${opts.heroImageUri}" alt="${escHtml(opts.brandName)}" /></div>
  <div class="title-footer">
    <div>
      <div class="for-label">Prepared for</div>
      <div class="for-value">${escHtml(opts.buyerCompany)} &nbsp;·&nbsp; ${escHtml(opts.buyerContact)}</div>
    </div>
    <div class="confidential">Confidential · Trade use only</div>
  </div>
</div>`
}

export function brandIntroSlide(opts: {
  brand: DeckBrand
  slideNum: number
  totalSlides: number
}): string {
  const { brand, slideNum, totalSlides } = opts
  return `<div class="slide s-brand-intro">
  <div class="accent-bar"></div>
  <div class="bi-left">
    <img src="${brand.assets.heroDataUri}" alt="${escHtml(brand.name)}" />
    <div class="bi-overlay"></div>
  </div>
  <div class="bi-right">
    <div class="bi-label"
      data-en="About the brand"
      data-nl="Over het merk">About the brand</div>
    <h2>${escHtml(brand.name)}</h2>
    <div class="bi-intro"
      data-en="${escHtml(brand.intro)}"
      data-nl="${escHtml(brand.intro)}">${escHtml(brand.intro)}</div>
    <div class="bi-desc"
      data-en="${escHtml(brand.assets.description)}"
      data-nl="${escHtml(brand.assets.description)}">${escHtml(brand.assets.description)}</div>
  </div>
  ${slideFooter(slideNum, totalSlides)}
</div>`
}

export function productIntroSlide(opts: {
  brandName: string
  product: DeckProduct
  slideNum: number
  totalSlides: number
}): string {
  const { brandName, product, slideNum, totalSlides } = opts
  const uspHtml = product.usps
    .map(u => `<div class="usp" data-en="${escHtml(u)}" data-nl="${escHtml(u)}">${escHtml(u)}</div>`)
    .join('\n      ')

  return `<div class="slide s-product">
  <div class="accent-bar"></div>
  <div class="img-panel">
    <img src="${product.imageDataUri}" alt="${escHtml(product.name)}" />
    <div class="yellow-strip"></div>
  </div>
  <div class="content-panel">
    <div class="prod-brand">${escHtml(brandName)}</div>
    <h2>${escHtml(product.name)}</h2>
    <div class="tagline"
      data-en="${escHtml(product.tagline)}"
      data-nl="${escHtml(product.tagline)}">"${escHtml(product.tagline)}"</div>
    <div class="desc"
      data-en="${escHtml(product.intro)}"
      data-nl="${escHtml(product.intro)}">${escHtml(product.intro)}</div>
    <div class="usps">
      ${uspHtml}
    </div>
  </div>
  ${slideFooter(slideNum, totalSlides)}
</div>`
}

export function pricingSlide(opts: {
  brandName: string
  product: DeckProduct
  slideNum: number
  totalSlides: number
}): string {
  const { brandName, product, slideNum, totalSlides } = opts
  const whyHtml = product.why_it_sells
    .map(w => `<div class="why-row"><div class="ydot"></div><span data-en="${escHtml(w)}" data-nl="${escHtml(w)}">${escHtml(w)}</span></div>`)
    .join('\n      ')

  return `<div class="slide s-pricing">
  <div class="accent-bar"></div>
  <div class="top-band">
    <div class="pname">${escHtml(product.name)}</div>
    <div class="bname">${escHtml(brandName)}</div>
  </div>
  <div class="body">
    <div class="bottle-zone">
      <img src="${product.imageDataUri}" alt="${escHtml(product.name)}" />
    </div>
    <div class="numbers">
      <div class="pcard">
        <div class="pl" data-en="Direct Delivery Price" data-nl="Directe Leveringsprijs">Direct Delivery Price</div>
        <div class="pv">${escHtml(product.prices.deliveryPrice)}</div>
        <div class="ps" data-en="What you pay · incl. excise" data-nl="Wat u betaalt · incl. accijns">What you pay · incl. excise</div>
      </div>
      <div class="pcard hl">
        <div class="pl" data-en="Consumer RSP" data-nl="Consumentenadviesprijs">Consumer RSP</div>
        <div class="pv">${escHtml(product.prices.rsp)}</div>
        <div class="ps" data-en="Shelf price · incl. VAT 21%" data-nl="Winkelprijs · incl. BTW 21%">Shelf price · incl. VAT 21%</div>
      </div>
      <div class="pcard">
        <div class="pl" data-en="Your Retail Margin" data-nl="Uw detailhandelmarge">Your Retail Margin</div>
        <div class="pv">${escHtml(product.prices.margin)}</div>
        <div class="ps" data-en="Off-trade standard" data-nl="Off-trade standaard">Off-trade standard</div>
      </div>
    </div>
    <div class="why-col">
      <div class="wlabel" data-en="Why it sells" data-nl="Waarom het verkoopt">Why it sells</div>
      ${whyHtml}
    </div>
  </div>
  ${slideFooter(slideNum, totalSlides)}
</div>`
}

export function overviewSlide(opts: {
  brands: DeckBrand[]
  slideNum: number
  totalSlides: number
}): string {
  const { brands, slideNum, totalSlides } = opts

  const rows = brands.flatMap(brand =>
    brand.products.map(p => `
    <tr>
      <td>
        <div class="pcell">
          <img class="pthumb" src="${p.imageDataUri}" alt="${escHtml(p.name)}" />
          <span class="pname-cell">${escHtml(p.name)}</span>
        </div>
      </td>
      <td class="brand-cell">${escHtml(brand.name)}</td>
      <td>${escHtml(p.intro.split('.')[0])}</td>
      <td>${escHtml(p.prices.deliveryPrice)}</td>
      <td class="rsp-val">${escHtml(p.prices.rsp)}</td>
      <td><span class="mpill">${escHtml(p.prices.margin)}</span></td>
      <td class="vol-val">${p.annual_volume_btl.toLocaleString('nl-NL')}</td>
    </tr>`)
  ).join('')

  return `<div class="slide s-overview">
  <div class="accent-bar"></div>
  <div class="ov-header">
    <div class="ov-title" data-en="Full Range Overview" data-nl="Volledig Assortiment">Full Range Overview</div>
    <div class="ov-bar"></div>
    <div class="ov-sub">NL Market · 2026</div>
  </div>
  <table>
    <thead>
      <tr>
        <th data-en="Product" data-nl="Product">Product</th>
        <th data-en="Brand" data-nl="Merk">Brand</th>
        <th data-en="Type" data-nl="Type">Type</th>
        <th data-en="Del. Price" data-nl="Lev. Prijs">Del. Price</th>
        <th data-en="Consumer RSP" data-nl="Cons. Adviesprijs">Consumer RSP</th>
        <th data-en="Margin" data-nl="Marge">Margin</th>
        <th data-en="Annual Vol (btl)" data-nl="Jaarl. Vol (fl)">Annual Vol (btl)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  ${slideFooter(slideNum, totalSlides)}
</div>`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/templates/slides.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/templates/slides.ts src/templates/slides.test.ts
git commit -m "feat: add HTML slide template functions with tests"
```

---

## Task 7: Deck generator

**Files:**
- Create: `src/lib/generate-deck.ts`
- Test: `src/lib/generate-deck.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/generate-deck.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { buildDeck } from './generate-deck'
import type { DeckData } from './types'

const MOCK_DECK: DeckData = {
  buyer: { company: 'Albert Heijn', contact: 'Jan de Vries' },
  language: 'en',
  brands: [
    {
      name: 'La Mundial Barcelona',
      intro: 'Wine-based sparkling.',
      assets: {
        logoDataUri: 'data:image/svg+xml;base64,abc',
        heroDataUri: 'data:image/jpeg;base64,def',
        productDataUris: ['data:image/png;base64,ghi'],
        description: 'A great brand.',
      },
      products: [
        {
          id: 'clarea',
          name: 'Clarea',
          intro: 'Peach sparkling.',
          tagline: 'Escape the ordinary',
          usps: ['Fine bubbles'],
          why_it_sells: ['New category'],
          annual_volume_btl: 2400,
          image_url: '',
          imageDataUri: 'data:image/png;base64,ghi',
          prices: { deliveryPrice: '€8.50', rsp: '€17.95', margin: '28%' },
        },
      ],
    },
  ],
}

describe('buildDeck', () => {
  it('returns a self-contained HTML document', () => {
    const html = buildDeck(MOCK_DECK, 'data:image/png;base64,pdclogo')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('</html>')
    expect(html).toContain('<style>')
    expect(html).toContain('setLang')
  })

  it('includes all slide types for one brand with one product', () => {
    const html = buildDeck(MOCK_DECK, 'data:image/png;base64,pdclogo')
    expect(html).toContain('s-title')
    expect(html).toContain('s-brand-intro')
    expect(html).toContain('s-product')
    expect(html).toContain('s-pricing')
    expect(html).toContain('s-overview')
  })

  it('injects correct slide numbers', () => {
    const html = buildDeck(MOCK_DECK, 'data:image/png;base64,pdclogo')
    // 1 title + 1 brand intro + 1 product intro + 1 pricing + 1 overview = 5 slides
    expect(html).toContain('05 / 05')
  })

  it('sets lang=nl when language is nl', () => {
    const nlDeck = { ...MOCK_DECK, language: 'nl' as const }
    const html = buildDeck(nlDeck, 'data:image/png;base64,pdclogo')
    expect(html).toContain('lang="nl"')
  })

  it('sets initial language to EN by default', () => {
    const html = buildDeck(MOCK_DECK, 'data:image/png;base64,pdclogo')
    expect(html).toContain("setLang('en')")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/generate-deck.test.ts
```

Expected: FAIL — `buildDeck` not defined.

- [ ] **Step 3: Write implementation**

Create `src/lib/generate-deck.ts`:
```typescript
import type { DeckData } from './types'
import {
  titleSlide,
  brandIntroSlide,
  productIntroSlide,
  pricingSlide,
  overviewSlide,
} from '@/templates/slides'

const PDC_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #111; font-family: 'Gill Sans', 'Gill Sans MT', Calibri, sans-serif; padding: 40px 24px; display: flex; flex-direction: column; align-items: center; gap: 0; }

.lang-controls { align-self: flex-start; display: flex; gap: 8px; margin-bottom: 28px; }
.lang-btn { background: #1a1a1a; border: 1px solid #2a2a2a; color: #666; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 6px 14px; cursor: pointer; font-family: 'Gill Sans', sans-serif; }
.lang-btn.active { background: #f8d418; border-color: #f8d418; color: #000; }

.slide { width: 640px; height: 360px; position: relative; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.8); flex-shrink: 0; margin-bottom: 24px; page-break-after: always; }

.accent-bar { position: absolute; top: 0; left: 0; right: 0; height: 5px; background: #f8d418; z-index: 10; }
.slide-footer { position: absolute; bottom: 0; left: 0; right: 0; height: 22px; background: #000; display: flex; align-items: center; padding: 0 20px; justify-content: space-between; z-index: 10; }
.slide-footer .sf-brand { font-size: 7px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #555; }
.slide-footer .sf-brand span { color: #f8d418; }
.slide-footer .sf-num { font-size: 7px; letter-spacing: 1px; color: #333; }

/* Title */
.s-title { background: #000; display: grid; grid-template-columns: 48% 1fr; }
.s-title .left { display: flex; flex-direction: column; justify-content: space-between; padding: 28px 36px 40px 36px; position: relative; z-index: 2; }
.s-title .left::after { content: ''; position: absolute; top: 16%; bottom: 14%; right: 0; width: 4px; background: #f8d418; }
.s-title .eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #f8d418; margin-bottom: 10px; }
.s-title h1 { font-size: 34px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #fff; line-height: 0.95; letter-spacing: -1px; margin-bottom: 12px; }
.s-title .subtitle { font-size: 11px; color: #555; font-family: 'Courier New', monospace; line-height: 1.7; max-width: 210px; }
.s-title .logo-row { display: flex; align-items: flex-end; justify-content: space-between; }
.s-title .logo-label { font-size: 7px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #444; margin-bottom: 4px; }
.s-title .pdc-logo { height: 26px; width: auto; object-fit: contain; object-position: left; }
.s-title .brand-logo { height: 44px; width: auto; object-fit: contain; object-position: right; filter: brightness(0) invert(1); }
.s-title .right { position: relative; overflow: hidden; }
.s-title .right img { width: 100%; height: 100%; object-fit: cover; object-position: center; }
.title-footer { position: absolute; bottom: 0; left: 0; right: 0; height: 34px; background: #0a0a0a; border-top: 1px solid #1a1a1a; z-index: 4; display: flex; align-items: center; padding: 0 36px; justify-content: space-between; }
.title-footer .for-label { font-size: 6.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #444; }
.title-footer .for-value { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #fff; }
.title-footer .confidential { font-size: 6.5px; letter-spacing: 1px; text-transform: uppercase; color: #333; }

/* Brand intro */
.s-brand-intro { background: #fff; display: grid; grid-template-columns: 45% 1fr; }
.s-brand-intro .bi-left { position: relative; overflow: hidden; }
.s-brand-intro .bi-left img { width: 100%; height: 100%; object-fit: cover; }
.s-brand-intro .bi-overlay { position: absolute; inset: 0; background: linear-gradient(to right, transparent 70%, rgba(255,255,255,0.6)); }
.s-brand-intro .bi-right { display: flex; flex-direction: column; justify-content: center; padding: 24px 28px; }
.s-brand-intro .bi-label { font-size: 8px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #aaa; margin-bottom: 8px; }
.s-brand-intro h2 { font-size: 22px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #000; line-height: 1.0; letter-spacing: -0.5px; margin-bottom: 10px; }
.s-brand-intro .bi-intro { font-size: 11px; color: #444; font-family: 'Courier New', monospace; line-height: 1.65; margin-bottom: 8px; }
.s-brand-intro .bi-desc { font-size: 10px; color: #888; font-family: 'Courier New', monospace; line-height: 1.6; }

/* Product intro */
.s-product { background: #fff; display: grid; grid-template-columns: 40% 1fr; }
.s-product .img-panel { position: relative; overflow: hidden; background: #f6f6f6; }
.s-product .img-panel img { width: 100%; height: 100%; object-fit: contain; padding: 16px; }
.s-product .yellow-strip { position: absolute; top: 0; right: 0; bottom: 0; width: 4px; background: #f8d418; }
.s-product .content-panel { display: flex; flex-direction: column; justify-content: center; padding: 24px 28px 30px 24px; }
.s-product .prod-brand { font-size: 9px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #aaa; margin-bottom: 5px; }
.s-product h2 { font-size: 26px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #000; line-height: 1.0; letter-spacing: -0.5px; margin-bottom: 8px; }
.s-product .tagline { font-size: 10px; color: #999; font-style: italic; margin-bottom: 10px; font-family: 'Courier New', monospace; }
.s-product .desc { font-size: 11px; color: #444; font-family: 'Courier New', monospace; line-height: 1.65; margin-bottom: 12px; }
.s-product .usps { display: flex; flex-direction: column; gap: 5px; }
.s-product .usp { background: #f6f6f6; border-left: 3px solid #f8d418; padding: 5px 9px; font-size: 10px; color: #333; font-family: 'Courier New', monospace; line-height: 1.4; }

/* Pricing */
.s-pricing { background: #fff; display: flex; flex-direction: column; }
.s-pricing .top-band { background: #000; padding: 11px 24px; display: flex; align-items: baseline; gap: 14px; }
.s-pricing .pname { font-size: 14px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #fff; }
.s-pricing .bname { font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #f8d418; }
.s-pricing .body { flex: 1; display: flex; margin-bottom: 22px; }
.s-pricing .bottle-zone { width: 110px; background: #f6f6f6; display: flex; align-items: center; justify-content: center; padding: 10px 8px; border-right: 1px solid #eee; }
.s-pricing .bottle-zone img { max-height: 100%; max-width: 100%; object-fit: contain; }
.s-pricing .numbers { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 14px 12px; }
.pcard { border: 1px solid #e8e8e8; padding: 8px 12px; background: #fff; }
.pcard .pl { font-size: 8.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #aaa; margin-bottom: 2px; }
.pcard .pv { font-size: 17px; font-weight: 700; color: #000; line-height: 1; }
.pcard .ps { font-size: 8.5px; color: #ccc; font-family: 'Courier New', monospace; margin-top: 2px; }
.pcard.hl { background: #f8d418; border-color: #f8d418; }
.pcard.hl .pl { color: rgba(0,0,0,0.4); }
.pcard.hl .pv { font-size: 27px; color: #000; }
.pcard.hl .ps { color: rgba(0,0,0,0.35); }
.s-pricing .why-col { width: 168px; padding: 14px 14px 14px 8px; display: flex; flex-direction: column; border-left: 1px solid #eee; margin-bottom: 22px; }
.wlabel { font-size: 8.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #aaa; margin-bottom: 9px; }
.why-row { display: flex; gap: 6px; align-items: flex-start; font-size: 10px; color: #444; font-family: 'Courier New', monospace; line-height: 1.5; margin-bottom: 7px; }
.ydot { width: 5px; height: 5px; background: #f8d418; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }

/* Overview */
.s-overview { background: #fff; display: flex; flex-direction: column; }
.s-overview .ov-header { background: #000; height: 60px; display: flex; align-items: center; padding: 0 28px; gap: 16px; }
.ov-title { font-size: 20px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #fff; letter-spacing: -0.5px; }
.ov-bar { width: 3px; height: 28px; background: #f8d418; flex-shrink: 0; }
.ov-sub { font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #f8d418; line-height: 1.6; }
.s-overview table { width: calc(100% - 56px); margin: 12px 28px 0; border-collapse: collapse; }
.s-overview thead th { font-size: 7.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #aaa; padding: 0 8px 8px; text-align: left; border-bottom: 2px solid #f8d418; }
.s-overview tbody td { padding: 7px 8px; font-size: 9px; color: #777; font-family: 'Courier New', monospace; border-bottom: 1px solid #f0f0f0; }
.s-overview .pcell { display: flex; align-items: center; gap: 8px; }
.s-overview .pthumb { width: 24px; height: 32px; object-fit: contain; background: #f6f6f6; }
.s-overview .pname-cell { font-family: 'Gill Sans', sans-serif; font-weight: 700; font-style: italic; text-transform: uppercase; font-size: 9px; color: #000; }
.s-overview .brand-cell { font-size: 8px; color: #aaa; }
.rsp-val { font-weight: 700; color: #000; }
.mpill { background: #f8d418; color: #000; font-size: 8px; font-weight: 700; padding: 2px 7px; letter-spacing: 0.5px; }
.vol-val { font-weight: 700; font-size: 9px; }
`

const TOGGLE_JS = `
function setLang(lang) {
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
  document.querySelectorAll('[data-en]').forEach(el => {
    const t = el.getAttribute('data-' + lang);
    if (t !== null) el.innerHTML = t;
  });
  document.documentElement.lang = lang;
}
`

export function buildDeck(data: DeckData, pdcLogoUri: string): string {
  const slides: string[] = []

  // Count total slides: per brand = 1 title + 1 brand intro + (2 per product), + 1 overview
  const totalSlides =
    data.brands.reduce((sum, b) => sum + 2 + b.products.length * 2, 0) + 1
  let slideNum = 1

  for (const brand of data.brands) {
    slides.push(titleSlide({
      brandName: brand.name,
      subtitle: brand.assets.description,
      heroImageUri: brand.assets.heroDataUri,
      pdcLogoUri,
      brandLogoUri: brand.assets.logoDataUri,
      buyerCompany: data.buyer.company,
      buyerContact: data.buyer.contact,
      slideNum: slideNum++,
      totalSlides,
    }))

    slides.push(brandIntroSlide({ brand, slideNum: slideNum++, totalSlides }))

    for (const product of brand.products) {
      slides.push(productIntroSlide({ brandName: brand.name, product, slideNum: slideNum++, totalSlides }))
      slides.push(pricingSlide({ brandName: brand.name, product, slideNum: slideNum++, totalSlides }))
    }
  }

  slides.push(overviewSlide({ brands: data.brands, slideNum: slideNum++, totalSlides }))

  const initialLang = data.language

  return `<!DOCTYPE html>
<html lang="${initialLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pitch Deck — ${data.brands.map(b => b.name).join(' · ')}</title>
<style>${PDC_CSS}</style>
</head>
<body>
<div class="lang-controls">
  <button class="lang-btn${initialLang === 'en' ? ' active' : ''}" data-lang="en" onclick="setLang('en')">EN</button>
  <button class="lang-btn${initialLang === 'nl' ? ' active' : ''}" data-lang="nl" onclick="setLang('nl')">NL</button>
</div>
${slides.join('\n')}
<script>${TOGGLE_JS}setLang('${initialLang}');</script>
</body>
</html>`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/lib/generate-deck.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Confirm all tests still pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/generate-deck.ts src/lib/generate-deck.test.ts src/templates/slides.ts
git commit -m "feat: add deck generator and slide templates with tests"
```

---

## Task 8: Screenshot and Vision services

**Files:**
- Create: `src/lib/screenshot.ts`
- Create: `src/lib/vision.ts`
- Test: `src/lib/vision.test.ts`

These services call external systems (Playwright browser, Anthropic API) — unit tests mock the API; screenshot is tested manually.

- [ ] **Step 1: Write vision test (failing)**

Create `src/lib/vision.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractBrandAssets } from './vision'

beforeEach(() => { vi.restoreAllMocks() })

const MOCK_RESPONSE = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      logoUrl: 'https://example.com/logo.png',
      heroImageUrl: 'https://example.com/hero.jpg',
      productImageUrls: ['https://example.com/product1.png'],
      description: 'A premium spirits brand from Spain.',
    }),
  }],
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue(MOCK_RESPONSE),
    },
  })),
}))

describe('extractBrandAssets', () => {
  it('returns parsed brand assets from Claude response', async () => {
    const result = await extractBrandAssets(
      Buffer.from('fakescreenshot'),
      'https://example.com'
    )
    expect(result.logoUrl).toBe('https://example.com/logo.png')
    expect(result.heroImageUrl).toBe('https://example.com/hero.jpg')
    expect(result.productImageUrls).toHaveLength(1)
    expect(result.description).toContain('Spain')
  })

  it('throws when Claude returns no JSON', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    vi.mocked(Anthropic).mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Sorry, I cannot analyse this image.' }],
        }),
      },
    }) as never)

    await expect(
      extractBrandAssets(Buffer.from('x'), 'https://example.com')
    ).rejects.toThrow('no JSON')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/vision.test.ts
```

Expected: FAIL — `extractBrandAssets` not defined.

- [ ] **Step 3: Write vision implementation**

Create `src/lib/vision.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { BrandAssets } from './types'

export async function extractBrandAssets(
  screenshotBuffer: Buffer,
  brandUrl: string
): Promise<BrandAssets> {
  const client = new Anthropic()
  const b64 = screenshotBuffer.toString('base64')
  const origin = new URL(brandUrl).origin

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
        },
        {
          type: 'text',
          text: `This is a screenshot of ${brandUrl}.
Extract as JSON (no markdown, just JSON):
{
  "logoUrl": "absolute URL of brand logo",
  "heroImageUrl": "absolute URL of best lifestyle/hero photo for a title slide",
  "productImageUrls": ["absolute URL of product pack shot 1", "..."],
  "description": "one paragraph brand description based on what you see"
}
If any URL is relative, prepend ${origin}.
Return only the JSON object.`,
        },
      ],
    }],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude Vision returned no JSON')

  return JSON.parse(match[0]) as BrandAssets
}
```

- [ ] **Step 4: Write screenshot implementation**

Create `src/lib/screenshot.ts`:
```typescript
import { chromium } from 'playwright-core'
import chromiumPkg from '@sparticuz/chromium'

export async function screenshotUrl(url: string): Promise<Buffer> {
  const executablePath =
    process.env.NODE_ENV === 'production'
      ? await chromiumPkg.executablePath()
      : undefined // local: use system Playwright Chromium

  const browser = await chromium.launch({
    executablePath,
    args: process.env.NODE_ENV === 'production' ? chromiumPkg.args : [],
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
```

- [ ] **Step 5: Run vision test to verify it passes**

```bash
npm test src/lib/vision.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 6: Install local Playwright browser for development**

```bash
npx playwright install chromium
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/screenshot.ts src/lib/vision.ts src/lib/vision.test.ts
git commit -m "feat: add screenshot and vision services"
```

---

## Task 9: Translation service

**Files:**
- Create: `src/lib/translate.ts`
- Test: `src/lib/translate.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/translate.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { translateToNl } from './translate'

beforeEach(() => { vi.restoreAllMocks() })

const INPUT = {
  'tagline_clarea': 'Escape the ordinary, enjoy a frenzy of freshness',
  'usp_0_clarea': 'Peachy notes · exotic spices · fine bubbles',
  'why_0_clarea': 'New wine-based fizz — growing demand for lighter alternatives',
}

const NL_OUTPUT = {
  'tagline_clarea': 'Ontsnaap aan het gewone, geniet van een explosie van frisheid',
  'usp_0_clarea': 'Perziknoten · exotische specerijen · fijne bruis',
  'why_0_clarea': 'Nieuwe wijnkategorie — groeiende vraag naar lichtere alternatieven',
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(NL_OUTPUT) }],
      }),
    },
  })),
}))

describe('translateToNl', () => {
  it('returns translated fields with same keys', async () => {
    const result = await translateToNl(INPUT)
    expect(Object.keys(result)).toEqual(Object.keys(INPUT))
    expect(result['tagline_clarea']).toContain('Ontsnaap')
  })

  it('throws when Claude returns no JSON', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    vi.mocked(Anthropic).mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Could not translate.' }],
        }),
      },
    }) as never)

    await expect(translateToNl(INPUT)).rejects.toThrow('no JSON')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/translate.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

Create `src/lib/translate.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { TranslationMap } from './types'

export async function translateToNl(fields: TranslationMap): Promise<TranslationMap> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Translate the following English marketing copy to contemporary Dutch.
Use natural, modern Dutch for retail trade buyers. No overly formal language.
Preserve any punctuation patterns like · or —.
Return as JSON with identical keys. No markdown, just the JSON object.

${JSON.stringify(fields, null, 2)}`,
    }],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Translation returned no JSON')

  return JSON.parse(match[0]) as TranslationMap
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/lib/translate.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/translate.ts src/lib/translate.test.ts
git commit -m "feat: add translation service with tests"
```

---

## Task 10: API routes

**Files:**
- Create: `src/app/api/analyse-brand/route.ts`
- Create: `src/app/api/parse-files/route.ts`
- Create: `src/app/api/translate/route.ts`
- Create: `src/app/api/generate/route.ts`

- [ ] **Step 1: Write analyse-brand route**

Create `src/app/api/analyse-brand/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { screenshotUrl } from '@/lib/screenshot'
import { extractBrandAssets } from '@/lib/vision'

export const maxDuration = 60 // Vercel Fluid Compute

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url: string }

    if (!url || !URL.canParse(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    let screenshot: Buffer
    try {
      screenshot = await screenshotUrl(url)
    } catch {
      return NextResponse.json(
        { error: 'Could not reach URL', fallback: true },
        { status: 422 }
      )
    }

    const assets = await extractBrandAssets(screenshot, url)
    return NextResponse.json({ assets })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Write parse-files route**

Create `src/app/api/parse-files/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { parseBrandYaml } from '@/lib/parse-yaml'
import { parseExcel } from '@/lib/parse-excel'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const yamlFile = formData.get('yaml') as File | null
    const excelFile = formData.get('excel') as File | null

    if (!yamlFile) return NextResponse.json({ error: 'Missing yaml file' }, { status: 400 })
    if (!excelFile) return NextResponse.json({ error: 'Missing excel file' }, { status: 400 })

    const yamlText = await yamlFile.text()
    const excelBuffer = Buffer.from(await excelFile.arrayBuffer())

    let yamlData
    try {
      yamlData = parseBrandYaml(yamlText)
    } catch (err) {
      return NextResponse.json(
        { error: `YAML error: ${err instanceof Error ? err.message : err}` },
        { status: 422 }
      )
    }

    let priceRows
    try {
      priceRows = parseExcel(excelBuffer)
    } catch (err) {
      return NextResponse.json(
        { error: `Excel error: ${err instanceof Error ? err.message : err}` },
        { status: 422 }
      )
    }

    // Check for unmatched products
    const yamlProductIds = yamlData.brands.flatMap(b => b.products.map(p => p.id))
    const excelProductIds = priceRows.map(r => r.productId)
    const unmatched = yamlProductIds.filter(id => !excelProductIds.includes(id))

    return NextResponse.json({ yamlData, priceRows, unmatched })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Write translate route**

Create `src/app/api/translate/route.ts`:
```typescript
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
```

- [ ] **Step 4: Write generate route**

Create `src/app/api/generate/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { imageToDataUri } from '@/lib/image-embed'
import { buildDeck } from '@/lib/generate-deck'
import type { DeckData, DeckBrand, DeckProduct, BrandAssets } from '@/lib/types'

const PDC_LOGO_URL =
  'https://pineappledrinks.com/wp-content/uploads/2025/02/Frame-76.png'

export const maxDuration = 60

interface GenerateRequest {
  deckData: Omit<DeckData, 'brands'> & {
    brands: Array<{
      name: string
      intro: string
      assets: BrandAssets
      products: Array<Omit<DeckProduct, 'imageDataUri'>>
    }>
  }
  translationOverrides?: Record<string, string>
}

export async function POST(req: NextRequest) {
  try {
    const { deckData, translationOverrides = {} } = await req.json() as GenerateRequest

    // Embed PDC logo
    const pdcLogoUri = await imageToDataUri(PDC_LOGO_URL)

    // Embed all brand images
    const embeddedBrands: DeckBrand[] = await Promise.all(
      deckData.brands.map(async brand => {
        const [logoDataUri, heroDataUri, ...productDataUris] = await Promise.all([
          imageToDataUri(brand.assets.logoUrl).catch(() => ''),
          imageToDataUri(brand.assets.heroImageUrl).catch(() => ''),
          ...brand.assets.productImageUrls.map(u => imageToDataUri(u).catch(() => '')),
        ])

        const products: DeckProduct[] = brand.products.map((p, idx) => {
          const imageDataUri =
            p.image_url
              ? '' // will be resolved separately if image_url set
              : productDataUris[idx] || ''

          const applyOverride = (key: string, fallback: string) =>
            translationOverrides[key] ?? fallback

          return {
            ...p,
            imageDataUri,
            tagline: applyOverride(`tagline_${p.id}`, p.tagline),
            intro: applyOverride(`intro_${p.id}`, p.intro),
            usps: p.usps.map((u, i) =>
              applyOverride(`usp_${i}_${p.id}`, u)
            ),
            why_it_sells: p.why_it_sells.map((w, i) =>
              applyOverride(`why_${i}_${p.id}`, w)
            ),
          }
        })

        return {
          name: brand.name,
          intro: brand.intro,
          assets: {
            logoDataUri,
            heroDataUri,
            productDataUris,
            description: brand.assets.description,
          },
          products,
        }
      })
    )

    const finalDeck: DeckData = {
      buyer: deckData.buyer,
      language: deckData.language,
      brands: embeddedBrands,
    }

    const html = buildDeck(finalDeck, pdcLogoUri)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pitch-deck.html"',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/
git commit -m "feat: add all four API routes"
```

---

## Task 11: Root layout and shared UI components

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: Update root layout**

Replace `src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PDC Pitch Generator',
  description: 'Generate branded pitch decks for retail buyers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-3 h-3 bg-[#f8d418]" />
            <span className="text-xs font-bold tracking-[3px] uppercase text-zinc-500">
              Pineapple Drinks Club
            </span>
            <span className="text-xs tracking-[2px] uppercase text-zinc-700">
              Pitch Generator
            </span>
          </div>
          {children}
        </div>
      </body>
    </html>
  )
}
```

Replace `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { font-family: 'Gill Sans MT', Calibri, sans-serif; }
```

- [ ] **Step 2: Verify layout renders**

```bash
npm run dev
```

Open http://localhost:3000. Expected: dark background, yellow square, "Pineapple Drinks Club" header.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: add dark PDC-themed root layout"
```

---

## Task 12: Step 1 UI — Brand Analysis

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write Step 1 page**

Replace `src/app/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BrandAssets } from '@/lib/types'

interface BrandEntry {
  url: string
  assets: BrandAssets | null
  loading: boolean
  error: string | null
  showFallback: boolean
  fallbackFile: File | null
}

export default function Step1() {
  const router = useRouter()
  const [brands, setBrands] = useState<BrandEntry[]>([
    { url: '', assets: null, loading: false, error: null, showFallback: false, fallbackFile: null },
  ])

  function updateBrand(idx: number, patch: Partial<BrandEntry>) {
    setBrands(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b))
  }

  async function analyseUrl(idx: number) {
    const entry = brands[idx]
    if (!entry.url) return
    updateBrand(idx, { loading: true, error: null, assets: null })

    const res = await fetch('/api/analyse-brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: entry.url }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.fallback) {
        updateBrand(idx, { loading: false, showFallback: true })
      } else {
        updateBrand(idx, { loading: false, error: data.error })
      }
      return
    }

    updateBrand(idx, { loading: false, assets: data.assets })
  }

  async function analyseFallback(idx: number) {
    const entry = brands[idx]
    if (!entry.fallbackFile) return
    updateBrand(idx, { loading: true, error: null })

    const formData = new FormData()
    formData.append('screenshot', entry.fallbackFile)
    formData.append('url', entry.url)

    const res = await fetch('/api/analyse-brand', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      updateBrand(idx, { loading: false, error: data.error })
      return
    }

    updateBrand(idx, { loading: false, assets: data.assets })
  }

  function proceed() {
    const ready = brands.filter(b => b.assets !== null)
    if (ready.length === 0) return
    sessionStorage.setItem('pdc:brands-assets', JSON.stringify(ready.map(b => ({
      url: b.url,
      assets: b.assets,
    }))))
    router.push('/step2')
  }

  const allDone = brands.every(b => b.assets !== null)

  return (
    <div>
      <h1 className="text-2xl font-black italic uppercase tracking-tight mb-1">
        Step 1 — Brand Analysis
      </h1>
      <p className="text-xs text-zinc-500 font-mono mb-8">
        Paste each brand URL. Claude Vision extracts the logo, hero image, and product photos.
      </p>

      <div className="flex flex-col gap-6">
        {brands.map((entry, idx) => (
          <div key={idx} className="border border-zinc-800 p-5">
            <div className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 mb-3">
              Brand {idx + 1}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
                placeholder="https://brand-website.com"
                value={entry.url}
                onChange={e => updateBrand(idx, { url: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && analyseUrl(idx)}
              />
              <button
                className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-4 py-2 disabled:opacity-40"
                onClick={() => analyseUrl(idx)}
                disabled={entry.loading || !entry.url}
              >
                {entry.loading ? 'Scanning…' : 'Analyse'}
              </button>
            </div>

            {entry.error && (
              <p className="text-red-400 text-xs font-mono mb-2">{entry.error}</p>
            )}

            {entry.showFallback && (
              <div className="border border-zinc-700 p-3 bg-zinc-900">
                <p className="text-xs text-zinc-400 font-mono mb-2">
                  URL could not be scraped. Upload a screenshot instead:
                </p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs text-zinc-400 font-mono"
                    onChange={e => updateBrand(idx, { fallbackFile: e.target.files?.[0] || null })}
                  />
                  <button
                    className="bg-zinc-700 text-white text-xs font-bold tracking-[2px] uppercase px-3 py-1 disabled:opacity-40"
                    onClick={() => analyseFallback(idx)}
                    disabled={!entry.fallbackFile || entry.loading}
                  >
                    Analyse
                  </button>
                </div>
              </div>
            )}

            {entry.assets && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <p className="text-xs font-bold text-[#f8d418] tracking-[2px] uppercase mb-2">
                  Extracted
                </p>
                <div className="flex gap-3 flex-wrap">
                  {entry.assets.logoUrl && (
                    <img src={entry.assets.logoUrl} alt="Logo" className="h-8 object-contain bg-zinc-800 p-1" />
                  )}
                  {entry.assets.heroImageUrl && (
                    <img src={entry.assets.heroImageUrl} alt="Hero" className="h-16 w-24 object-cover" />
                  )}
                  {entry.assets.productImageUrls.slice(0, 3).map((u, i) => (
                    <img key={i} src={u} alt={`Product ${i + 1}`} className="h-16 w-16 object-contain bg-zinc-800" />
                  ))}
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-2 leading-relaxed">
                  {entry.assets.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          className="border border-zinc-700 text-zinc-500 text-xs font-bold tracking-[2px] uppercase px-4 py-2 hover:border-zinc-500"
          onClick={() => setBrands(prev => [...prev, {
            url: '', assets: null, loading: false, error: null, showFallback: false, fallbackFile: null,
          }])}
        >
          + Add brand
        </button>
        <button
          className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-6 py-2 disabled:opacity-40 ml-auto"
          onClick={proceed}
          disabled={!allDone}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test manually**

```bash
npm run dev
```

Open http://localhost:3000. Enter `https://lamundialbarcelona.com`, click Analyse. Verify extracted assets appear. Click "+ Add brand". Click Continue.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add Step 1 brand analysis UI"
```

---

## Task 13: Step 2 UI — Content Upload

**Files:**
- Create: `src/app/step2/page.tsx`

- [ ] **Step 1: Write Step 2 page**

Create `src/app/step2/page.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { YamlInput, PriceRow } from '@/lib/types'

export default function Step2() {
  const router = useRouter()
  const [yamlFile, setYamlFile] = useState<File | null>(null)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [yamlData, setYamlData] = useState<YamlInput | null>(null)
  const [priceRows, setPriceRows] = useState<PriceRow[]>([])
  const [language, setLanguage] = useState<'en' | 'nl'>('en')

  useEffect(() => {
    const stored = sessionStorage.getItem('pdc:brands-assets')
    if (!stored) router.push('/')
  }, [router])

  async function parseFiles() {
    if (!yamlFile || !excelFile) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('yaml', yamlFile)
    formData.append('excel', excelFile)

    const res = await fetch('/api/parse-files', { method: 'POST', body: formData })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) {
      setError(data.error)
      return
    }

    setYamlData(data.yamlData)
    setPriceRows(data.priceRows)
    setUnmatched(data.unmatched)
  }

  function proceed() {
    if (!yamlData) return
    const brandsAssets = JSON.parse(sessionStorage.getItem('pdc:brands-assets') || '[]')
    sessionStorage.setItem('pdc:step2', JSON.stringify({
      brandsAssets,
      yamlData,
      priceRows,
      language,
    }))
    router.push('/step3')
  }

  const ready = yamlData !== null && unmatched.length === 0

  return (
    <div>
      <h1 className="text-2xl font-black italic uppercase tracking-tight mb-1">
        Step 2 — Content
      </h1>
      <p className="text-xs text-zinc-500 font-mono mb-8">
        Upload your brand.yaml and value-chain.xlsx.
      </p>

      <div className="flex flex-col gap-4 mb-6">
        <div className="border border-zinc-800 p-5">
          <div className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 mb-3">
            brand.yaml
          </div>
          <input
            type="file"
            accept=".yaml,.yml"
            className="text-xs text-zinc-400 font-mono"
            onChange={e => setYamlFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="border border-zinc-800 p-5">
          <div className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 mb-3">
            value-chain.xlsx
          </div>
          <input
            type="file"
            accept=".xlsx"
            className="text-xs text-zinc-400 font-mono"
            onChange={e => setExcelFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div className="flex gap-3 items-center mb-6">
        <span className="text-xs font-bold tracking-[2px] uppercase text-zinc-600">Language:</span>
        {(['en', 'nl'] as const).map(l => (
          <button
            key={l}
            className={`text-xs font-bold tracking-[2px] uppercase px-4 py-2 border ${
              language === l
                ? 'bg-[#f8d418] border-[#f8d418] text-black'
                : 'border-zinc-700 text-zinc-500'
            }`}
            onClick={() => setLanguage(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        className="bg-zinc-800 text-white text-xs font-bold tracking-[2px] uppercase px-5 py-2 mb-6 disabled:opacity-40"
        onClick={parseFiles}
        disabled={!yamlFile || !excelFile || loading}
      >
        {loading ? 'Parsing…' : 'Parse files'}
      </button>

      {error && <p className="text-red-400 text-xs font-mono mb-4">{error}</p>}

      {unmatched.length > 0 && (
        <div className="border border-yellow-800 bg-yellow-950 p-4 mb-4">
          <p className="text-xs font-bold text-[#f8d418] mb-1">Unmatched products</p>
          <p className="text-xs text-zinc-400 font-mono">
            These product IDs are in brand.yaml but not in the Excel: {unmatched.join(', ')}
          </p>
        </div>
      )}

      {yamlData && (
        <div className="border border-zinc-800 p-4 mb-6">
          <p className="text-xs font-bold text-[#f8d418] tracking-[2px] uppercase mb-2">Parsed</p>
          <p className="text-xs text-zinc-400 font-mono">
            {yamlData.brands.length} brand(s) · {yamlData.brands.reduce((s, b) => s + b.products.length, 0)} product(s)
          </p>
          <p className="text-xs text-zinc-500 font-mono">
            Buyer: {yamlData.buyer.company} · {yamlData.buyer.contact}
          </p>
          <p className="text-xs text-zinc-500 font-mono">
            {priceRows.length} price rows from Excel
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button
          className="border border-zinc-700 text-zinc-500 text-xs font-bold tracking-[2px] uppercase px-4 py-2"
          onClick={() => router.push('/')}
        >
          ← Back
        </button>
        <button
          className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-6 py-2 disabled:opacity-40 ml-auto"
          onClick={proceed}
          disabled={!ready}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test manually**

Navigate from Step 1 to http://localhost:3000/step2. Upload a brand.yaml and Excel. Verify parsed summary appears. Click Continue.

- [ ] **Step 3: Commit**

```bash
git add src/app/step2/page.tsx
git commit -m "feat: add Step 2 content upload UI"
```

---

## Task 14: Step 3 UI — Translation Review + Download

**Files:**
- Create: `src/app/step3/page.tsx`

- [ ] **Step 1: Write Step 3 page**

Create `src/app/step3/page.tsx`:
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { YamlInput, PriceRow, TranslationMap } from '@/lib/types'

interface Step2State {
  brandsAssets: Array<{ url: string; assets: { logoUrl: string; heroImageUrl: string; productImageUrls: string[]; description: string } }>
  yamlData: YamlInput
  priceRows: PriceRow[]
  language: 'en' | 'nl'
}

function buildTranslatableFields(yamlData: YamlInput): TranslationMap {
  const fields: TranslationMap = {}
  yamlData.brands.forEach((brand, bi) => {
    brand.products.forEach(p => {
      fields[`intro_${bi}_${p.id}`] = p.intro
      fields[`tagline_${bi}_${p.id}`] = p.tagline
      p.usps.forEach((u, i) => { fields[`usp_${i}_${bi}_${p.id}`] = u })
      p.why_it_sells.forEach((w, i) => { fields[`why_${i}_${bi}_${p.id}`] = w })
    })
  })
  return fields
}

export default function Step3() {
  const router = useRouter()
  const [state, setState] = useState<Step2State | null>(null)
  const [translating, setTranslating] = useState(false)
  const [enFields, setEnFields] = useState<TranslationMap>({})
  const [nlFields, setNlFields] = useState<TranslationMap>({})
  const [userEdits, setUserEdits] = useState<TranslationMap>({})
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('pdc:step2')
    if (!stored) { router.push('/'); return }
    const s = JSON.parse(stored) as Step2State
    setState(s)

    const fields = buildTranslatableFields(s.yamlData)
    setEnFields(fields)

    if (s.language === 'nl') {
      setTranslating(true)
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
        .then(r => r.json())
        .then(data => {
          setNlFields(data.translated || {})
          setTranslating(false)
        })
        .catch(() => setTranslating(false))
    }
  }, [router])

  const effectiveNl = useCallback((key: string) =>
    userEdits[key] ?? nlFields[key] ?? enFields[key], [userEdits, nlFields, enFields])

  async function generate() {
    if (!state) return
    setGenerating(true)
    setError(null)

    const overrides = state.language === 'nl'
      ? Object.fromEntries(
          Object.keys(enFields).map(k => [k, effectiveNl(k)])
        )
      : {}

    // Merge YAML + Excel + brand assets into generate request
    const priceIndex: Record<string, PriceRow> = {}
    state.priceRows.forEach(r => { priceIndex[r.productId] = r })

    const brands = state.yamlData.brands.map((brand, bi) => {
      const brandAssets = state.brandsAssets[bi]?.assets ?? {
        logoUrl: '', heroImageUrl: '', productImageUrls: [], description: brand.intro,
      }
      return {
        name: brand.name,
        intro: brand.intro,
        assets: brandAssets,
        products: brand.products.map(p => ({
          ...p,
          prices: priceIndex[p.id]
            ? { deliveryPrice: priceIndex[p.id].deliveryPrice, rsp: priceIndex[p.id].rsp, margin: priceIndex[p.id].margin }
            : { deliveryPrice: '–', rsp: '–', margin: '–' },
        })),
      }
    })

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deckData: { buyer: state.yamlData.buyer, language: state.language, brands },
        translationOverrides: overrides,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      setGenerating(false)
      return
    }

    const html = await res.text()
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pitch-deck.html'
    a.click()
    setGenerating(false)
  }

  if (!state) return <p className="text-xs text-zinc-500 font-mono">Loading…</p>

  const showTranslation = state.language === 'nl'

  return (
    <div>
      <h1 className="text-2xl font-black italic uppercase tracking-tight mb-1">
        Step 3 — {showTranslation ? 'Review Translation' : 'Generate'}
      </h1>
      <p className="text-xs text-zinc-500 font-mono mb-8">
        {showTranslation
          ? 'Claude auto-translated the copy. Edit any field below, then generate.'
          : 'All set. Click Generate to download your pitch deck.'}
      </p>

      {translating && (
        <p className="text-xs text-[#f8d418] font-mono mb-6">Translating with Claude…</p>
      )}

      {showTranslation && !translating && (
        <div className="mb-8">
          <div className="grid grid-cols-[140px_1fr_1fr_32px] gap-0 mb-1">
            {['Field', 'English', 'Nederlands — click to edit', ''].map(h => (
              <span key={h} className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 px-2 pb-2">{h}</span>
            ))}
          </div>

          {Object.entries(enFields).map(([key, enVal]) => {
            const nlVal = effectiveNl(key)
            const edited = userEdits[key] !== undefined

            return (
              <div
                key={key}
                className="grid grid-cols-[140px_1fr_1fr_32px] border-t border-zinc-900 items-start"
              >
                <span className="text-xs font-mono text-zinc-600 px-2 py-2 leading-tight">{key}</span>
                <span className="text-xs font-mono text-zinc-500 px-2 py-2 leading-relaxed border-l border-zinc-900">{enVal}</span>
                <textarea
                  className={`text-xs font-mono px-2 py-2 border-l border-zinc-900 bg-transparent resize-none outline-none leading-relaxed ${
                    edited ? 'text-emerald-400' : 'text-zinc-400'
                  }`}
                  rows={Math.max(1, Math.ceil(nlVal.length / 50))}
                  value={nlVal}
                  onChange={e => setUserEdits(prev => ({ ...prev, [key]: e.target.value }))}
                />
                <button
                  className="text-zinc-700 hover:text-[#f8d418] text-sm px-2 py-2 border-l border-zinc-900"
                  title="Reset to auto-translation"
                  onClick={() => setUserEdits(prev => { const n = { ...prev }; delete n[key]; return n })}
                >
                  ↺
                </button>
              </div>
            )
          })}

          <p className="text-xs text-zinc-600 font-mono mt-3">
            {Object.keys(userEdits).length === 0
              ? 'No edits — using auto-translation'
              : `${Object.keys(userEdits).length} field(s) edited`}
          </p>
        </div>
      )}

      {error && <p className="text-red-400 text-xs font-mono mb-4">{error}</p>}

      <div className="flex gap-3 mt-2">
        <button
          className="border border-zinc-700 text-zinc-500 text-xs font-bold tracking-[2px] uppercase px-4 py-2"
          onClick={() => router.push('/step2')}
        >
          ← Back
        </button>
        <button
          className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-8 py-2 disabled:opacity-40 ml-auto"
          onClick={generate}
          disabled={generating || translating}
        >
          {generating ? 'Generating…' : 'Generate & Download →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test full flow manually**

```bash
npm run dev
```

Run through all three steps with real brand.yaml and Excel. Verify:
- Step 1: brand assets extracted and previewed
- Step 2: files parsed, buyer + product count shown
- Step 3 (EN): generate button downloads pitch-deck.html
- Step 3 (NL): translation appears, edits highlighted green, reset works, download works
- Open pitch-deck.html in browser: all slides render, EN/NL toggle works

- [ ] **Step 3: Commit**

```bash
git add src/app/step3/page.tsx
git commit -m "feat: add Step 3 translation review and download UI"
```

---

## Task 15: Vercel deployment

**Files:**
- Create: `vercel.json`
- Create: `.gitignore` updates

- [ ] **Step 1: Create vercel.json**

Create `vercel.json`:
```json
{
  "functions": {
    "src/app/api/analyse-brand/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/generate/route.ts": {
      "maxDuration": 60
    }
  }
}
```

- [ ] **Step 2: Ensure .gitignore has .env.local**

```bash
grep -q '.env.local' .gitignore || echo '.env.local' >> .gitignore
```

- [ ] **Step 3: Push to GitHub**

```bash
git add vercel.json .gitignore
git commit -m "feat: add Vercel config for long-running routes"
git push origin main
```

- [ ] **Step 4: Deploy on Vercel**

1. Go to https://vercel.com/new
2. Import the GitHub repository
3. Add environment variable: `ANTHROPIC_API_KEY` = your key
4. Deploy

- [ ] **Step 5: Test production deployment**

Open the Vercel URL. Run through the full three-step flow with a real brand URL. Verify the downloaded HTML deck opens correctly with all images and the EN/NL toggle.

---

## Post-deployment checklist

- [ ] Step 1 analyses a brand URL successfully (Playwright + Claude Vision working in prod)
- [ ] Step 1 fallback to screenshot upload works
- [ ] Step 2 parses a real brand.yaml + Excel without errors
- [ ] Step 2 reports unmatched products correctly
- [ ] Step 3 EN: downloads deck with correct content
- [ ] Step 3 NL: translation appears, user edits persist, download includes edited copy
- [ ] Downloaded deck opens standalone in browser (no external deps)
- [ ] EN/NL toggle works in the deck
- [ ] Deck prints cleanly to PDF (Cmd+P → Save as PDF from browser)
