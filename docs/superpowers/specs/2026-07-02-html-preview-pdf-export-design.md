# Design: HTML preview + PDF export for the pitch deck

**Date:** 2026-07-02
**Status:** Approved (pending spec review)

## Problem

The deck is generated with `pptxgenjs`. Its image-fitting (`sizing: cover/contain`)
distorted brand and product images so badly that the composer was changed to throw every
image away and render empty "PASTE IMAGE" placeholders instead
(`src/lib/deck-composer/index.ts`, `safeImage`). The user pastes images by hand in
PowerPoint. That is the "PPT not showing good output" the user reported.

The user also wants to **review and edit the deck in-app before publishing** the final
artifact.

## Decision

Replace the pptxgenjs path with a single HTML renderer that is the source of truth for the
deck layout, consumed two ways:

- **In-app preview** — the HTML is shown in an `<iframe>` on Step 3 so the user reviews the
  real deck (with images fitted correctly) and edits before publishing.
- **PDF export** — the *same* HTML string is printed to PDF by Playwright.

Because preview and PDF consume the identical HTML, the preview is pixel-identical to the
published PDF.

**Final artifact:** PDF only. The pptxgenjs `.pptx` path is retired.

This reverses the earlier "output must be PPTX" decision. Editability in PowerPoint is
given up deliberately, because all review/editing now happens in the preview stage.

The PDC house-style rule is unchanged: brand assets fill image slots only; colors, fonts,
and layout always come from `src/lib/deck-template/tokens.ts`.

## Architecture

```
Step 3 UI  ──POST /api/generate──▶  build DeckInput (fetch images → data URIs)
   │  iframe srcDoc = HTML             │
   │                                   └─▶ renderDeckHtml(input) ─▶ HTML string ─▶ text/html
   │
   └──POST /api/publish──▶  build DeckInput ─▶ renderDeckHtml(input) ─▶ HTML string
                                                     └─▶ deckHtmlToPdf(html) ─▶ Playwright page.pdf() ─▶ application/pdf
```

### Units

1. **`src/lib/deck-html/render.ts`** — `renderDeckHtml(input: DeckInput): string`
   - Pure, synchronous. Returns a complete self-contained HTML document: `<!doctype html>`,
     inline `<style>`, all image slots as `<img>` with embedded data URIs already present on
     `input`.
   - Ports the exact PDC layout currently in `deck-composer/index.ts`: title slide, brand
     intro, product intro (with USP cards), pricing slide (RSP card, excl/incl pair, margin
     card, "why it sells" dots), overview table. Same slide order and count.
   - All styling derives from `deck-template/tokens.ts`. Colors are the same hex values
     (prefixed with `#` for CSS). Fonts use CSS stacks mirroring the token substitutes:
     display → `Impact, "Arial Black", sans-serif`; body → `"Courier New", monospace`;
     ui → `"Gill Sans MT", "Gill Sans", sans-serif`. Point sizes from `type` map to `pt`
     units in CSS so proportions match the current deck.
   - Each slide is a `<section class="slide">` sized to the 16:9 canvas (13.333in × 7.5in)
     with `page-break-after: always` and `@page { size: 13.333in 7.5in; margin: 0 }` so one
     slide = one PDF page.
   - Images use `object-fit: cover` (hero) / `object-fit: contain` (logos, product shots) —
     the fix for the distortion. An image slot with no data URI renders a soft-gray box
     (same `surfaceSoft` fill) with no "PASTE IMAGE" text — it is genuinely optional now,
     not a manual TODO.

2. **`src/lib/deck-pdf/export.ts`** — `deckHtmlToPdf(html: string): Promise<Buffer>`
   - Reuses the `launchBrowser()` pattern from `brand-scraper/crawl.ts` (serverless →
     `playwright-core` + `@sparticuz/chromium-min`; local → `playwright`). Extract that
     launcher into a shared `src/lib/browser.ts` so both scraper and PDF export use one copy.
   - `page.setContent(html, { waitUntil: 'networkidle' })`, then
     `page.pdf({ printBackground: true, width: '13.333in', height: '7.5in', pageRanges,
     preferCSSPageSize: true })`. Returns the PDF buffer. Always closes the browser.

3. **API routes**
   - `POST /api/generate` — unchanged request body; now builds `DeckInput` (same image
     fetching as today) and returns `renderDeckHtml(input)` as `text/html`. Used by preview.
   - `POST /api/publish` — same body/`DeckInput` build, returns
     `deckHtmlToPdf(renderDeckHtml(input))` as `application/pdf`,
     `Content-Disposition: attachment; filename="pitch-deck.pdf"`. `maxDuration = 60`.
   - The `DeckInput`-building logic (currently inline in `/api/generate`) moves to a shared
     helper `src/lib/deck-input.ts` so both routes build input identically.

4. **Step 3 UI (`src/app/step3/page.tsx`)**
   - Keep the existing editable price/image grid untouched.
   - Add a **Preview** panel: a "Refresh preview" button POSTs to `/api/generate`, receives
     HTML, and sets it as an `<iframe srcDoc={...}>` scaled to fit the panel width. Manual
     refresh (not live) because building input re-fetches images and is expensive.
   - Replace the "Generate .pptx" button with **"Publish PDF"** → POSTs to `/api/publish`,
     downloads `pitch-deck.pdf`.
   - Heading/copy updated from "Review & Generate" to reflect preview → publish.

### Retired

- `src/lib/deck-composer/index.ts` and `index.test.ts` (pptxgenjs layout).
- `.pptx` `Content-Disposition` / MIME in `/api/generate`.
- `pptxgenjs` import usages. The dependency may stay in `package.json` but is unused.

## Data flow / types

`DeckInput`, `BrandSlot`, `ProductSlot`, `BuyerSlot` in `deck-template/types.ts` are reused
as-is — they already carry `heroDataUri`, `logoDataUri`, `imageDataUri`, all copy strings,
prices, and `marginMode`. `renderDeckHtml` consumes exactly this shape, so no type changes
are needed. The i18n helpers move from `deck-composer/i18n.ts` to `deck-html/i18n.ts` (same `t`,
`marginHeader`, `marginLabel` functions and strings, imported by the renderer).

## Error handling

- `/api/generate`: image fetch failures already fall back to `''` (empty slot) via
  `.catch(() => '')`; the renderer shows a soft-gray box. Renderer never throws on missing
  images.
- `/api/publish`: if Playwright fails to launch or print, return `500` with the error
  message (same shape as today's catch block). Browser is closed in a `finally`.
- Preview fetch failure in the UI surfaces the existing `setError` banner.

## Testing

- **`deck-html/render.test.ts`** — `renderDeckHtml` returns a string containing one
  `<section class="slide">` per expected slide (2 + 2×products per brand, + 1 overview),
  embeds provided data URIs, includes brand/product/price copy, and applies token colors.
  Pure function → fast, no browser.
- **`deck-pdf/export.test.ts`** (local-only / guarded) — `deckHtmlToPdf` on a small HTML
  returns a Buffer starting with `%PDF`. Skipped in serverless CI if Chromium download is
  unavailable.
- Update `src/lib/e2e.test.ts` to assert the pipeline now yields HTML/PDF, not pptx.
- Remove `deck-composer/index.test.ts`.

## Out of scope (YAGNI)

- Live/auto-updating preview (manual refresh only).
- Per-slide bilingual rendering (the `lang` reserved param stays reserved).
- Keeping a secondary `.pptx` download.
- Restyling or improving the PDC layout beyond a faithful port.
