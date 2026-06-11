# Brand Pitch Tool — Design Spec
_2026-06-11_

## Overview

A personal web tool for Rogier (Pineapple Drinks Club) to generate HTML pitch decks for potential retail buyers. A single deck can pitch one or multiple brands in one go. The PDC house style (black/yellow/white) is always the visual template; brand identity enters only through logos, pack shots, and photography — never through color or font theming.

---

## Architecture

**Stack:** Next.js App Router, hosted on Vercel, deployed from GitHub.

**Three-step web UI:**
1. Brand Analysis — paste URL → Claude Vision extracts brand tokens + product images
2. Product Content — upload `brand.yaml` + `value-chain.xlsx`
3. Generate — download `pitch-deck.html`

**Key services:**
- Playwright (Vercel Fluid Compute) — screenshots the brand URL
- Claude Vision API — analyses screenshot, produces design analysis YAML matching `examples/pineapple-drinks-club.md` quality
- `xlsx` library — parses value-chain Excel via row-label lookup
- `js-yaml` — parses brand.yaml
- HTML template engine — assembles final deck from tokens + content

---

## Brand Analysis

When a brand URL is submitted the tool:
1. Screenshots the page with Playwright
2. Sends the screenshot to Claude Vision
3. Claude extracts: brand logo URL, product image URLs, and a one-paragraph brand description
4. The user can add multiple brands — each goes through this flow independently

If a URL cannot be scraped, the user uploads screenshots directly — the same Claude Vision flow applies.

The PDC logo is always fetched from `https://pineappledrinks.com/wp-content/uploads/2025/02/Frame-76.png` and embedded as base64 in every output deck.

Claude Vision does **not** extract color/font tokens — the PDC design system is fixed.

---

## Data Model

### brand.yaml

A deck can contain one or multiple brands. Each brand has its own `products` list.

```yaml
buyer:
  company: "Albert Heijn"
  contact: "Jan de Vries"

brands:
  - name: "La Mundial Barcelona"
    url: "https://lamundialbarcelona.com"
    intro: |
      Wine-based aromatised sparkling beverages...
    products:
      - id: clarea
        name: "Clarea"
        intro: |
          Wine-based sparkling with peach notes...
        tagline: "Escape the ordinary, enjoy a frenzy of freshness"
        usps:
          - "Peachy notes · exotic spices · fine bubbles"
          - "Locally grown grapes · Barcelona province"
          - "Radically different — new category"
        why_it_sells:
          - "New wine-based fizz — growing demand for lighter alternatives"
          - "Golden colour drives impulse purchase at shelf"
          - "Anchors alongside Cava and Prosecco"
        annual_volume_btl: 2400
        image_url: ""   # optional override; tool scrapes automatically if blank

  - name: "Roots Divino"
    url: "https://www.finestroots.com"
    intro: |
      0% non-alcoholic aperitifs from the island of Lesbos...
    products:
      - id: rosso
        name: "Aperitif Rosso"
        ...
```

### value-chain.xlsx

Column layout (row-label lookup, not positional):

| Row label | Extracted as |
|---|---|
| Brand Name | brand name per product column |
| Product / SKU | product id for YAML matching |
| Direct Delivery Price to retailer (incl.excise) | buying price |
| CONSUMER RSP (incl.excise + VAT) | shelf price |
| Off-trade retail margin % | retail margin |

Products are matched from Excel to YAML by `Product / SKU` value = YAML `id`.

---

## Pitch Deck Structure

All slides share:
- 5px yellow (`#f8d418`) accent bar at top
- Minimal footer: "Pineapple Drinks Club" + slide number
- EN/NL language toggle (baked into output HTML, switches instantly client-side)

### Slide types

**1. Title slide**
- Split layout: black text panel left (48%) / hero image right (52%)
- Yellow vertical divider between panels
- Content: eyebrow, brand name (h1), subtitle
- Bottom of left panel: PDC logo (bottom-left) + brand logo (bottom-right, 3× PDC logo height)
- Dark footer strip: "Prepared for: [buyer company · contact]" left, "Confidential · Trade use only" right (small)

**2. Brand introduction slide**
- Full-bleed lifestyle image left, content right
- Brand story, tagline, attribute pills

**3. Product introduction slide** _(one per product)_
- Image left (40%), content right (60%)
- Yellow strip on right edge of image panel
- Content: brand label, product name (h1 italic), tagline, description, USP bullets (yellow left-border, no emoji)

**4. Pricing slide** _(one per product)_
- Black header band: product name + brand label in yellow
- Bottle shot zone (110px) / price cards / "Why it sells" column
- Three price cards: Delivery Price · Consumer RSP (yellow fill, 27px value) · Retail Margin
- "Why it sells" bullets in Courier New

**5. Overview slide** _(one, final)_
- Black header band with title + yellow vertical rule
- Table: Product thumbnail + name / **Brand** / Type / Delivery Price / **Consumer RSP (bold)** / Retail Margin (yellow pill) / Annual Exp. Volume (btl)
- Brand column identifies which brand each product belongs to (essential for multi-brand decks)
- Volume values come from `brand.yaml` per product

---

## Translation Flow

When Dutch is selected during generation:
1. Claude translates all text fields from English to Dutch automatically
2. Before the download button appears, a **translation review screen** is shown
3. Side-by-side table: field label / English source / Dutch (editable textarea)
4. Edited fields highlighted green; reset arrow restores auto-translation
5. User confirms → final HTML bakes in reviewed Dutch copy

The EN/NL toggle in the output deck switches between the two language versions client-side with no server round-trip.

---

## Slide Styling

The PDC house style is fixed and applies to every deck regardless of brand:
- Background colors: `#000` (title/header bands), `#fff` (content slides)
- Accent: `#f8d418` (accent bar, USP borders, RSP card fill, margin pills, yellow dividers)
- Typography: Gill Sans (display), Courier New (body mono)

Brand identity enters only through:
- Brand logo (embedded in title slide bottom-right, inverted white on black)
- Product pack shots (bottle images in product intro + pricing slides)
- Brand photography (hero image on title slide)

Claude Vision still analyses the brand URL to extract product image URLs and the logo. It does **not** produce a color/font token set — the design is not themed per brand.

The PDC design system (`examples/pineapple-drinks-club.md`) is the reference for visual quality.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| URL unreachable / blocked | Show "Upload screenshots instead" — same AI flow |
| Excel column not found | Show warning with expected column name, allow manual override |
| Product in YAML has no Excel match | Flag unmatched product, allow user to skip or enter price manually |
| Brand image URL broken | Fall back to blank placeholder zone in slide |

---

## Out of Scope

- PowerPoint / PPTX export
- Multi-user / authentication
- Saving/history of past decks
- Mobile-responsive UI (personal tool, desktop only)
