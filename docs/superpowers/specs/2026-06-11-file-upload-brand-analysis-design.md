# File Upload & Brand Analysis — Design Spec
Date: 2026-06-11

## Goal
Make file upload a first-class input option in Step 1, alongside URL analysis. Users can drop a screenshot, PDF, or brand deck and get the same full extraction (visuals + brand content) as the URL path.

## Scope
- Add drop zone always visible in Step 1 brand cards
- Support PNG/JPG images and PDFs
- PPTX rejected client-side with "export as PDF from PowerPoint" hint
- Both URL and file paths populate assets + editable brand content fields
- No font extraction (deck uses Pineapple Drinks Club house fonts)
- No drive/library integration (separate future feature)

## UI — Step 1 (`src/app/page.tsx`)

### State changes
- Remove `showFallback: boolean` (no longer needed — drop zone always visible)
- Rename `fallbackFile` → `uploadFile: File | null`
- Remove `fallbackFile: File | null`

### Layout
Each brand card shows:
1. URL input + Analyse button
2. "or upload a file" divider (always rendered)
3. Drop zone: accepts `image/*` and `application/pdf`
   - Empty state: drag hint + "browse" link
   - File selected: filename, size, type, remove button, Analyse button
   - PPTX dropped: inline error "Export as PDF from PowerPoint first"
4. `analyseUrl(idx)` — unchanged trigger
5. `analyseFile(idx)` — new trigger, sends multipart POST to `/api/analyse-brand`

Both paths populate `assets` + `brandContent` identically; editable fields appear below in both cases.

## API Route — `/api/analyse-brand` (`src/app/api/analyse-brand/route.ts`)

### Multipart path (extended)
Detect MIME type of uploaded file:
- `image/*` → compress to JPEG → `extractAssetsFromImage` + `extractBrandContentFromImage` → return `{ assets, brandContent }`
- `application/pdf` → `extractFromPdf` → return `{ assets, brandContent }`
- anything else → `400 { error: 'Unsupported file type. Upload PNG, JPG, or PDF.' }`

### JSON/URL path
Unchanged.

## Vision Library — `src/lib/vision.ts`

### New: `extractBrandContentFromImage(buffer, brandUrl)`
Claude Vision call. Reads text visible in the screenshot and returns `ExtractedBrand` (name, intro, products with taglines/USPs). Same schema as `extractBrandContent` from URL path.

### New: `extractFromPdf(pdfBuffer, brandUrl)`
Single Claude call using document source type (`media_type: 'application/pdf'`). One prompt requesting both:
- Assets: describe logo, hero image, product pack shots seen (no real URLs — `logoUrl`, `heroImageUrl`, `productImageUrls` return empty strings)
- Brand content: name, intro, products with id/tagline/intro/USPs/why_it_sells

Returns `{ assets: BrandAssets, brandContent: ExtractedBrand }`.

`productImageUrls` will be empty for PDF path — user uploads product photos manually in per-product fields as today.

## Out of Scope
- PPTX parsing
- Drive/folder library access
- Font extraction
- Bulk deck analysis
