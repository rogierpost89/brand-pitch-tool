# File Upload Brand Analysis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make file upload (images + PDFs) a first-class brand analysis option in Step 1, extracting both visual assets and editable brand content — the same as the URL path.

**Architecture:** Extend `vision.ts` with two new functions (`extractBrandContentFromImage`, `extractFromPdf`), update the API route to route by MIME type and return `brandContent` for all file types, then redesign the Step 1 UI to always show a drop zone alongside the URL input.

**Tech Stack:** Next.js App Router, Claude Anthropic SDK (`claude-opus-4-8`), Vitest, Tailwind CSS

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/lib/vision.ts` | Modify | Add `extractBrandContentFromImage` and `extractFromPdf` |
| `src/lib/vision.test.ts` | Modify | Add tests for both new functions |
| `src/app/api/analyse-brand/route.ts` | Modify | Route multipart by MIME; return `brandContent` for image + PDF paths |
| `src/app/page.tsx` | Modify | Remove `showFallback`; always-visible drop zone; `analyseFile` function |

---

## Task 1: `extractBrandContentFromImage` in vision.ts

**Files:**
- Modify: `src/lib/vision.ts`
- Test: `src/lib/vision.test.ts`

- [ ] **Step 1.1: Write the failing test**

Add to `src/lib/vision.test.ts` (after the existing `extractAssetsFromImage` describe block):

```typescript
const MOCK_BRAND: ExtractedBrand = {
  name: 'Example Brand',
  intro: 'A premium spirits brand from Spain.',
  products: [
    {
      id: 'example-product',
      name: 'Example Product',
      intro: 'A crisp, refreshing spirit.',
      tagline: 'Taste the sunshine',
      usps: ['USP 1 · detail', 'USP 2 · detail', 'USP 3 · detail'],
      why_it_sells: ['Reason 1', 'Reason 2', 'Reason 3'],
      annual_volume_btl: 0,
      image_url: '',
    },
  ],
}

describe('extractBrandContentFromImage', () => {
  it('returns parsed brand content from Claude vision response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(MOCK_BRAND) }],
    })

    const result = await extractBrandContentFromImage(
      Buffer.from('fakescreenshot'),
      'https://example.com'
    )
    expect(result.name).toBe('Example Brand')
    expect(result.products).toHaveLength(1)
    expect(result.products[0].tagline).toBe('Taste the sunshine')
  })

  it('throws when Claude returns no JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Cannot read this image.' }],
    })

    await expect(
      extractBrandContentFromImage(Buffer.from('x'), 'https://example.com')
    ).rejects.toThrow('no JSON')
  })
})
```

Also add `extractBrandContentFromImage` to the import line at the top of the test file:
```typescript
import { extractAssetsFromPage, extractAssetsFromImage, extractBrandContentFromImage, extractFromPdf } from './vision'
import type { ExtractedBrand } from './types'
```

- [ ] **Step 1.2: Run test to confirm it fails**

```bash
cd /Users/newnew/Developer/brand-pitch-tool
npx vitest run src/lib/vision.test.ts
```

Expected: FAIL — `extractBrandContentFromImage is not a function`

- [ ] **Step 1.3: Implement `extractBrandContentFromImage` in vision.ts**

Add after the `extractAssetsFromImage` function:

```typescript
export async function extractBrandContentFromImage(
  screenshotBuffer: Buffer,
  brandUrl: string
): Promise<ExtractedBrand> {
  const b64 = screenshotBuffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
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

Read all text visible in the image and extract brand and product information.
Return ONLY a JSON object (no markdown):
{
  "name": "brand name",
  "intro": "2-3 sentence brand intro for a B2B pitch deck",
  "products": [
    {
      "id": "slug-of-product-name",
      "name": "Product Name",
      "intro": "2-3 sentence product description",
      "tagline": "short punchy tagline",
      "usps": [
        "USP 1 — key attribute · detail",
        "USP 2 — key attribute · detail",
        "USP 3 — key attribute · detail"
      ],
      "why_it_sells": [
        "Reason 1 why a retailer should stock this",
        "Reason 2",
        "Reason 3"
      ],
      "annual_volume_btl": 0,
      "image_url": ""
    }
  ]
}

Rules:
- id must be a lowercase slug (e.g. "clarea", "aperitif-rosso")
- usps should use " · " as separator for sub-points
- why_it_sells should be retailer-facing reasons (margin, trend, consumer demand)
- annual_volume_btl is always 0
- image_url is always ""
- If product details are not visible, use empty strings for text fields
- Return only the JSON object`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude Vision returned no JSON for brand content')
  return JSON.parse(match[0]) as ExtractedBrand
}
```

- [ ] **Step 1.4: Run test to confirm it passes**

```bash
npx vitest run src/lib/vision.test.ts
```

Expected: `extractBrandContentFromImage` describe block passes, all prior tests still pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/vision.ts src/lib/vision.test.ts
git commit -m "feat: add extractBrandContentFromImage to vision lib"
```

---

## Task 2: `extractFromPdf` in vision.ts

**Files:**
- Modify: `src/lib/vision.ts`
- Test: `src/lib/vision.test.ts`

- [ ] **Step 2.1: Write the failing test**

Add to `src/lib/vision.test.ts` (after the `extractBrandContentFromImage` describe block):

```typescript
const MOCK_PDF_RESULT = {
  assets: {
    logoUrl: '',
    heroImageUrl: '',
    productImageUrls: [],
    description: 'A premium spirits brand visible in the PDF.',
  },
  brandContent: MOCK_BRAND,
}

describe('extractFromPdf', () => {
  it('returns assets and brand content from PDF via Claude document API', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(MOCK_PDF_RESULT) }],
    })

    const result = await extractFromPdf(
      Buffer.from('fakepdfbytes'),
      'https://example.com'
    )
    expect(result.assets.description).toContain('PDF')
    expect(result.brandContent.name).toBe('Example Brand')
    expect(result.brandContent.products).toHaveLength(1)
  })

  it('throws when Claude returns no JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Cannot read this document.' }],
    })

    await expect(
      extractFromPdf(Buffer.from('x'), 'https://example.com')
    ).rejects.toThrow('no JSON')
  })
})
```

- [ ] **Step 2.2: Run test to confirm it fails**

```bash
npx vitest run src/lib/vision.test.ts
```

Expected: FAIL — `extractFromPdf is not a function`

- [ ] **Step 2.3: Implement `extractFromPdf` in vision.ts**

Add after `extractBrandContentFromImage`:

```typescript
export async function extractFromPdf(
  pdfBuffer: Buffer,
  brandUrl: string
): Promise<{ assets: BrandAssets; brandContent: ExtractedBrand }> {
  const b64 = pdfBuffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: b64 },
        } as Parameters<typeof client.messages.create>[0]['messages'][0]['content'][0],
        {
          type: 'text',
          text: `This is a brand document for ${brandUrl}.

Read all pages and extract both visual asset descriptions and brand content.
Return ONLY a JSON object (no markdown):
{
  "assets": {
    "logoUrl": "",
    "heroImageUrl": "",
    "productImageUrls": [],
    "description": "one paragraph describing the brand based on what you see in the document"
  },
  "brandContent": {
    "name": "brand name",
    "intro": "2-3 sentence brand intro for a B2B pitch deck",
    "products": [
      {
        "id": "slug-of-product-name",
        "name": "Product Name",
        "intro": "2-3 sentence product description",
        "tagline": "short punchy tagline",
        "usps": [
          "USP 1 — key attribute · detail",
          "USP 2 — key attribute · detail",
          "USP 3 — key attribute · detail"
        ],
        "why_it_sells": [
          "Reason 1 why a retailer should stock this",
          "Reason 2",
          "Reason 3"
        ],
        "annual_volume_btl": 0,
        "image_url": ""
      }
    ]
  }
}

Rules:
- logoUrl, heroImageUrl, productImageUrls must always be empty strings / empty array (no real URLs available from a PDF)
- description should be a rich one-paragraph summary of the brand based on all pages
- id must be a lowercase slug (e.g. "clarea", "aperitif-rosso")
- usps should use " · " as separator for sub-points
- why_it_sells should be retailer-facing reasons (margin, trend, consumer demand)
- annual_volume_btl is always 0
- image_url is always ""
- Include all products found in the document
- Return only the JSON object`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude returned no JSON from PDF')
  return JSON.parse(match[0]) as { assets: BrandAssets; brandContent: ExtractedBrand }
}
```

- [ ] **Step 2.4: Run test to confirm it passes**

```bash
npx vitest run src/lib/vision.test.ts
```

Expected: all tests pass including the two new `extractFromPdf` tests.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/vision.ts src/lib/vision.test.ts
git commit -m "feat: add extractFromPdf to vision lib using Claude document API"
```

---

## Task 3: Extend the API route to handle MIME types and return brandContent for all file paths

**Files:**
- Modify: `src/app/api/analyse-brand/route.ts`

- [ ] **Step 3.1: Replace the multipart branch in the API route**

Open `src/app/api/analyse-brand/route.ts`. Replace the entire `if (contentType.includes('multipart/form-data'))` block with:

```typescript
if (contentType.includes('multipart/form-data')) {
  const form = await req.formData()
  const url = (form.get('url') as string) || 'https://unknown.com'
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const mime = file.type
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  if (mime === 'application/pdf') {
    const { assets, brandContent } = await extractFromPdf(buffer, url)
    return NextResponse.json({ assets, brandContent })
  }

  if (mime.startsWith('image/')) {
    const compressed = await compressToJpeg(buffer)
    const [assets, brandContent] = await Promise.all([
      extractAssetsFromImage(compressed, url),
      extractBrandContentFromImage(compressed, url),
    ])
    return NextResponse.json({ assets, brandContent })
  }

  return NextResponse.json(
    { error: 'Unsupported file type. Upload PNG, JPG, or PDF.' },
    { status: 400 }
  )
}
```

- [ ] **Step 3.2: Add `compressToJpeg` helper and update imports in the route file**

At the top of `src/app/api/analyse-brand/route.ts`, update the import:

```typescript
import { extractAssetsFromPage, extractAssetsFromImage, extractBrandContentFromImage, extractFromPdf } from '@/lib/vision'
```

Then add `compressToJpeg` as a server-side helper function (sharp is not available on Vercel serverless without a custom layer, so use a simple buffer pass-through — the client already compresses to JPEG before sending):

```typescript
async function compressToJpeg(buffer: Buffer): Promise<Buffer> {
  // Client compresses to JPEG before upload; pass through as-is
  return buffer
}
```

- [ ] **Step 3.3: Verify the build compiles**

```bash
cd /Users/newnew/Developer/brand-pitch-tool
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3.4: Commit**

```bash
git add src/app/api/analyse-brand/route.ts
git commit -m "feat: extend analyse-brand API to handle PDF and image MIME types with full content extraction"
```

---

## Task 4: Redesign Step 1 UI — always-visible drop zone

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 4.1: Update `BrandEntry` type and initial state**

In `src/app/page.tsx`, find the `BrandEntry` interface and replace it:

```typescript
interface BrandEntry {
  url: string
  assets: BrandAssets | null
  brandContent: ExtractedBrand | null
  loading: boolean
  error: string | null
  uploadFile: File | null        // renamed from fallbackFile; now always-visible
  contentOpen: boolean
}
```

Update the initial state in the `useState` call:

```typescript
const [brands, setBrands] = useState<BrandEntry[]>([
  { url: '', assets: null, brandContent: null, loading: false, error: null, uploadFile: null, contentOpen: true },
])
```

Update the `setBrands` call in the "+ Add brand" button at the bottom:

```typescript
onClick={() => setBrands(prev => [...prev, {
  url: '', assets: null, brandContent: null, loading: false, error: null, uploadFile: null, contentOpen: true,
}])}
```

Update the `useEffect` restore block — replace `fallbackFile: null` with `uploadFile: null`:

```typescript
setBrands(parsed.map(b => ({
  url: b.url,
  assets: b.assets,
  brandContent: b.brandContent,
  loading: false,
  error: null,
  uploadFile: null,
  contentOpen: false,
})))
```

- [ ] **Step 4.2: Add `analyseFile` function**

Add this function after `analyseUrl` in `src/app/page.tsx`:

```typescript
async function analyseFile(idx: number) {
  const entry = brands[idx]
  if (!entry.uploadFile) return

  const file = entry.uploadFile
  const mime = file.type

  if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.name.toLowerCase().endsWith('.pptx')) {
    updateBrand(idx, { error: 'PPTX not supported — export as PDF from PowerPoint first.' })
    return
  }

  updateBrand(idx, { loading: true, error: null, assets: null, brandContent: null })

  const formData = new FormData()
  formData.append('url', entry.url || 'https://unknown.com')

  if (mime.startsWith('image/')) {
    const compressed = await compressImage(file)
    formData.append('file', compressed, 'upload.jpg')
  } else {
    formData.append('file', file, file.name)
  }

  const res = await fetch('/api/analyse-brand', { method: 'POST', body: formData })
  const data = await res.json()

  if (!res.ok) {
    updateBrand(idx, { loading: false, error: data.error })
    return
  }

  updateBrand(idx, {
    loading: false,
    assets: data.assets,
    brandContent: data.brandContent ?? emptyBrandContent(),
    contentOpen: true,
  })
}
```

- [ ] **Step 4.3: Remove `analyseFallback` and update all references**

Delete the `analyseFallback` function entirely (it is replaced by `analyseFile`).

Also delete the `compressImage` function's existing location check — it stays, it's used by `analyseFile` above. Make sure it is still defined in the file (it is, at line ~172 in the original).

- [ ] **Step 4.4: Replace the brand card JSX with the new layout**

Find the JSX block inside `{brands.map((entry, idx) => (` and replace the section between the URL row and the assets section. Specifically:

**Remove** the old fallback block:
```tsx
{entry.showFallback && (
  <div className="border border-zinc-700 p-3 bg-zinc-900">
    ...entire old fallback div...
  </div>
)}
```

**Replace** with the always-visible drop zone (insert between the error paragraph and the `{entry.assets && ...}` block):

```tsx
{/* Always-visible file drop zone */}
<div className="mt-3">
  <div className="flex items-center gap-3 mb-2">
    <div className="flex-1 h-px bg-zinc-800" />
    <span className="text-zinc-600 text-xs font-mono">or upload a file</span>
    <div className="flex-1 h-px bg-zinc-800" />
  </div>

  {!entry.uploadFile ? (
    <label
      className="block border border-dashed border-zinc-700 p-4 text-center cursor-pointer hover:border-zinc-500 transition-colors"
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) updateBrand(idx, { uploadFile: f, error: null })
      }}
    >
      <div className="text-zinc-500 text-xs font-mono mb-1">
        Drop screenshot, PDF, or brand presentation
      </div>
      <div className="text-zinc-600 text-xs font-mono">
        PNG · JPG · PDF — or{' '}
        <span className="text-[#f8d418] underline">browse</span>
      </div>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) updateBrand(idx, { uploadFile: f, error: null })
        }}
      />
    </label>
  ) : (
    <div className="border border-dashed border-[#f8d418] px-4 py-3 flex items-center gap-3">
      <span className="text-sm">📄</span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-mono truncate">{entry.uploadFile.name}</div>
        <div className="text-zinc-500 text-xs font-mono">
          {(entry.uploadFile.size / 1024 / 1024).toFixed(1)} MB · {entry.uploadFile.type || 'file'}
        </div>
      </div>
      <button
        className="text-zinc-600 hover:text-red-400 text-xs font-mono px-1"
        onClick={() => updateBrand(idx, { uploadFile: null })}
      >
        ✕
      </button>
      <button
        className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-3 py-1.5 disabled:opacity-40"
        onClick={() => analyseFile(idx)}
        disabled={entry.loading}
      >
        {entry.loading ? 'Analysing…' : 'Analyse'}
      </button>
    </div>
  )}

  <p className="text-zinc-700 text-xs font-mono mt-1">
    PPTX? Export as PDF from PowerPoint first.
  </p>
</div>
```

- [ ] **Step 4.5: Update `allDone` logic**

The `allDone` check allows proceeding when any brand has assets. This is unchanged and still correct — no update needed.

- [ ] **Step 4.6: Start the dev server and verify the UI**

```bash
npm run dev
```

Open http://localhost:3000. Check:
- Each brand card shows URL input + "or upload a file" divider + drop zone
- Dropping a file shows filename + Analyse button
- PPTX file shows the error message
- Clicking the Analyse button on the file calls the API and populates the editable fields
- URL Analyse still works unchanged

- [ ] **Step 4.7: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: always-visible file drop zone in Step 1 alongside URL input"
```

---

## Self-Review

### Spec coverage
- ✅ Layout B (URL + drop zone always visible) — Task 4
- ✅ Image upload extracts assets + brand content — Tasks 1 + 3
- ✅ PDF upload extracts assets + brand content via Claude document API — Tasks 2 + 3
- ✅ PPTX rejected with helpful message — Task 4.2 (`analyseFile` guard)
- ✅ Brand content fields pre-filled for all file types — Tasks 1, 2, 3
- ✅ No font extraction — not in plan
- ✅ URL path unchanged — Task 3 only modifies multipart branch

### Placeholder scan
- No TBD or TODO
- All code blocks complete
- All type references consistent

### Type consistency
- `extractBrandContentFromImage(Buffer, string): Promise<ExtractedBrand>` — defined Task 1, used Task 3 ✅
- `extractFromPdf(Buffer, string): Promise<{ assets: BrandAssets, brandContent: ExtractedBrand }>` — defined Task 2, used Task 3 ✅
- `BrandEntry.uploadFile` — defined Task 4.1, used Task 4.2, 4.4 ✅
- `analyseFile(idx)` — defined Task 4.2, called in Task 4.4 JSX ✅
- `formData.append('file', ...)` in client matches `form.get('file')` in API route ✅
