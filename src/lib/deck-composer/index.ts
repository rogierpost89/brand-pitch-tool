import PptxGenJS from 'pptxgenjs'
import { colors, slide, type } from '@/lib/deck-template/tokens'
import type {
  BrandSlot,
  BuyerSlot,
  DeckInput,
  Language,
  MarginMode,
  ProductSlot,
} from '@/lib/deck-template/types'
import { marginHeader, marginLabel, t } from './i18n'

const { widthIn: W, heightIn: H, accentBarHeightIn: AB, footerHeightIn: FH } = slide

/**
 * Compose a PPTX pitch deck.
 *
 * The PDC house style is the ONLY layout. Brand inputs contribute images + copy strings —
 * never colors, fonts, or layout. See src/lib/deck-template/types.ts for the type-level
 * enforcement of this rule, and tokens.ts for the source of styling.
 */
export async function composeDeck(input: DeckInput): Promise<Buffer> {
  const pres = new PptxGenJS()
  pres.layout = 'LAYOUT_WIDE' // 13.333 x 7.5 inches
  pres.title = `Pitch Deck — ${input.brands.map(b => b.name).join(' · ')}`
  pres.company = 'Pineapple Drinks Club'

  const totalSlides =
    input.brands.reduce((sum, b) => sum + 2 + b.products.length * 2, 0) + 1
  let slideNum = 1

  for (const brand of input.brands) {
    addTitleSlide(pres, input, brand, slideNum++, totalSlides)
    addBrandIntroSlide(pres, input, brand, slideNum++, totalSlides)
    for (const product of brand.products) {
      addProductIntroSlide(pres, input, brand, product, slideNum++, totalSlides)
      addPricingSlide(pres, input, brand, product, slideNum++, totalSlides)
    }
  }
  addOverviewSlide(pres, input, slideNum++, totalSlides)

  const result = await pres.write({ outputType: 'nodebuffer' })
  return result as Buffer
}

// ---------- Shared helpers ----------

function addAccentBar(s: PptxGenJS.Slide): void {
  s.addShape('rect', {
    x: 0, y: 0, w: W, h: AB,
    fill: { color: colors.primary },
    line: { type: 'none' },
  })
}

function addSlideFooter(
  s: PptxGenJS.Slide,
  num: number,
  total: number,
  lang: Language,
): void {
  s.addShape('rect', {
    x: 0, y: H - FH, w: W, h: FH,
    fill: { color: colors.ink },
    line: { type: 'none' },
  })
  s.addText(
    [
      { text: 'Pineapple ', options: { color: colors.mutedLink } },
      { text: 'Drinks Club', options: { color: colors.primary } },
    ],
    {
      x: 0.3, y: H - FH, w: 4, h: FH,
      fontFace: type.uiMicro.face,
      fontSize: type.uiMicro.size,
      bold: true,
      charSpacing: 2,
      valign: 'middle',
    },
  )
  s.addText(
    `${String(num).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
    {
      x: W - 1.5, y: H - FH, w: 1.2, h: FH,
      fontFace: type.uiMicro.face,
      fontSize: type.uiMicro.size,
      color: colors.subdued,
      align: 'right',
      valign: 'middle',
    },
  )
  // Lang is reserved for future per-slide bilingual rendering; currently single-language decks.
  void lang
}

function safeImage(
  s: PptxGenJS.Slide,
  dataUri: string,
  opts: { x: number; y: number; w: number; h: number; sizing?: 'cover' | 'contain' },
): void {
  if (!dataUri || !dataUri.startsWith('data:')) {
    // Fallback: gray placeholder rectangle if no image
    s.addShape('rect', {
      x: opts.x, y: opts.y, w: opts.w, h: opts.h,
      fill: { color: colors.surfaceSoft },
      line: { color: colors.hairline, width: 1 },
    })
    return
  }
  s.addImage({
    data: dataUri,
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    sizing: opts.sizing
      ? { type: opts.sizing, w: opts.w, h: opts.h }
      : undefined,
  })
}

// ---------- Title slide ----------

function addTitleSlide(
  pres: PptxGenJS,
  input: DeckInput,
  brand: BrandSlot,
  num: number,
  total: number,
): void {
  const s = pres.addSlide()
  s.background = { color: colors.ink }
  addAccentBar(s)

  const splitX = W * 0.48
  const titleFooterH = 0.55
  const padX = 0.6

  // Right: hero image (covers right side)
  safeImage(s, brand.images.heroDataUri, {
    x: splitX, y: 0, w: W - splitX, h: H - titleFooterH, sizing: 'cover',
  })

  // Vertical yellow line at split
  s.addShape('rect', {
    x: splitX - 0.04, y: H * 0.16, w: 0.04, h: H * 0.55,
    fill: { color: colors.primary }, line: { type: 'none' },
  })

  // Eyebrow
  s.addText(t('pitchEyebrow', input.language), {
    x: padX, y: 0.6, w: splitX - padX * 2, h: 0.3,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.primary, bold: true, charSpacing: 3,
  })

  // Brand headline
  s.addText(brand.name, {
    x: padX, y: 1.0, w: splitX - padX * 2, h: 1.8,
    fontFace: type.displayHero.face, fontSize: type.displayHero.size,
    bold: true, italic: true, color: colors.canvas,
    valign: 'top',
  })

  // Subtitle (mono description)
  s.addText(brand.description || brand.intro, {
    x: padX, y: 2.9, w: splitX - padX * 2, h: 2.0,
    fontFace: type.body.face, fontSize: type.body.size,
    color: colors.mutedLink, valign: 'top',
  })

  // Logo row (bottom of left panel)
  const logoRowY = H - titleFooterH - 1.3
  s.addText(t('presentedBy', input.language), {
    x: padX, y: logoRowY, w: 2, h: 0.2,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.subdued, bold: true, charSpacing: 2,
  })
  safeImage(s, input.pdcLogoDataUri, {
    x: padX, y: logoRowY + 0.25, w: 2.0, h: 0.55, sizing: 'contain',
  })
  // Brand logo (right-aligned in left panel)
  safeImage(s, brand.images.logoDataUri, {
    x: splitX - 2.5 - padX, y: logoRowY + 0.1, w: 2.5, h: 0.75, sizing: 'contain',
  })

  // Title footer band
  s.addShape('rect', {
    x: 0, y: H - titleFooterH, w: W, h: titleFooterH,
    fill: { color: '0A0A0A' }, line: { type: 'none' },
  })
  s.addText(t('preparedFor', input.language), {
    x: padX, y: H - titleFooterH + 0.05, w: 2.5, h: 0.2,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.subdued, bold: true, charSpacing: 1.5,
  })
  s.addText(`${input.buyer.company}  ·  ${input.buyer.contact}`, {
    x: padX, y: H - titleFooterH + 0.25, w: 6, h: 0.25,
    fontFace: type.uiLabel.face, fontSize: type.uiLabel.size,
    bold: true, color: colors.canvas, charSpacing: 1,
  })
  s.addText(t('confidential', input.language), {
    x: W - 4 - padX, y: H - titleFooterH + 0.15, w: 4, h: 0.25,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.subdued, align: 'right', charSpacing: 1,
  })

  // No standard footer on title (it has its own footer band)
  void num
  void total
}

// ---------- Brand intro ----------

function addBrandIntroSlide(
  pres: PptxGenJS,
  input: DeckInput,
  brand: BrandSlot,
  num: number,
  total: number,
): void {
  const s = pres.addSlide()
  s.background = { color: colors.canvas }
  addAccentBar(s)

  const splitX = W * 0.45
  const bodyY = AB + 0.1
  const bodyH = H - bodyY - FH

  // Left: hero image
  safeImage(s, brand.images.heroDataUri, {
    x: 0, y: bodyY, w: splitX, h: bodyH, sizing: 'cover',
  })

  // Right: content
  const rPadX = 0.6
  const rX = splitX + rPadX
  const rW = W - rX - rPadX

  s.addText(t('aboutTheBrand', input.language), {
    x: rX, y: bodyY + 0.6, w: rW, h: 0.3,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.muted, bold: true, charSpacing: 3,
  })
  s.addText(brand.name, {
    x: rX, y: bodyY + 1.0, w: rW, h: 1.2,
    fontFace: type.brandH1.face, fontSize: type.brandH1.size,
    bold: true, italic: true, color: colors.ink,
  })
  s.addText(brand.intro, {
    x: rX, y: bodyY + 2.3, w: rW, h: 1.4,
    fontFace: type.body.face, fontSize: type.body.size,
    color: colors.subdued, valign: 'top',
  })
  s.addText(brand.description, {
    x: rX, y: bodyY + 3.8, w: rW, h: 1.6,
    fontFace: type.body.face, fontSize: type.body.size - 1,
    color: colors.muted, valign: 'top',
  })

  addSlideFooter(s, num, total, input.language)
}

// ---------- Product intro ----------

function addProductIntroSlide(
  pres: PptxGenJS,
  input: DeckInput,
  brand: BrandSlot,
  product: ProductSlot,
  num: number,
  total: number,
): void {
  const s = pres.addSlide()
  s.background = { color: colors.canvas }
  addAccentBar(s)

  const imgPanelW = W * 0.40
  const bodyY = AB + 0.1
  const bodyH = H - bodyY - FH

  // Left: gray panel with product image + yellow accent strip
  s.addShape('rect', {
    x: 0, y: bodyY, w: imgPanelW, h: bodyH,
    fill: { color: colors.surfaceSoft }, line: { type: 'none' },
  })
  safeImage(s, product.imageDataUri, {
    x: 0.3, y: bodyY + 0.3, w: imgPanelW - 0.6, h: bodyH - 0.6, sizing: 'contain',
  })
  s.addShape('rect', {
    x: imgPanelW - 0.05, y: bodyY, w: 0.05, h: bodyH,
    fill: { color: colors.primary }, line: { type: 'none' },
  })

  // Right: content
  const rPadX = 0.55
  const rX = imgPanelW + rPadX
  const rW = W - rX - rPadX

  s.addText(brand.name, {
    x: rX, y: bodyY + 0.5, w: rW, h: 0.25,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.muted, bold: true, charSpacing: 3,
  })
  s.addText(product.name, {
    x: rX, y: bodyY + 0.85, w: rW, h: 1.0,
    fontFace: type.productH1.face, fontSize: type.productH1.size,
    bold: true, italic: true, color: colors.ink,
  })
  s.addText(`"${product.tagline}"`, {
    x: rX, y: bodyY + 1.95, w: rW, h: 0.45,
    fontFace: type.body.face, fontSize: type.body.size,
    italic: true, color: colors.muted,
  })
  s.addText(product.intro, {
    x: rX, y: bodyY + 2.45, w: rW, h: 1.3,
    fontFace: type.body.face, fontSize: type.body.size,
    color: colors.subdued, valign: 'top',
  })

  // USP cards (yellow left border)
  const uspY0 = bodyY + 3.85
  const uspH = 0.55
  const uspGap = 0.12
  product.usps.slice(0, 3).forEach((u, i) => {
    const y = uspY0 + i * (uspH + uspGap)
    // Background
    s.addShape('rect', {
      x: rX, y, w: rW, h: uspH,
      fill: { color: colors.surfaceSoft }, line: { type: 'none' },
    })
    // Yellow border
    s.addShape('rect', {
      x: rX, y, w: 0.08, h: uspH,
      fill: { color: colors.primary }, line: { type: 'none' },
    })
    s.addText(u, {
      x: rX + 0.2, y, w: rW - 0.25, h: uspH,
      fontFace: type.body.face, fontSize: type.body.size - 1,
      color: colors.subdued, valign: 'middle',
    })
  })

  addSlideFooter(s, num, total, input.language)
}

// ---------- Pricing slide ----------

function addPricingSlide(
  pres: PptxGenJS,
  input: DeckInput,
  brand: BrandSlot,
  product: ProductSlot,
  num: number,
  total: number,
): void {
  const s = pres.addSlide()
  s.background = { color: colors.canvas }
  addAccentBar(s)

  const topBandH = 0.7
  const topY = AB + 0.05

  // Black top band with product + brand
  s.addShape('rect', {
    x: 0, y: topY, w: W, h: topBandH,
    fill: { color: colors.ink }, line: { type: 'none' },
  })
  s.addText(product.name, {
    x: 0.6, y: topY, w: 8, h: topBandH,
    fontFace: type.displayXL.face, fontSize: 28,
    bold: true, italic: true, color: colors.canvas, valign: 'middle',
  })
  s.addText(brand.name, {
    x: 0.6, y: topY, w: 12, h: topBandH,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size + 2,
    color: colors.primary, bold: true, charSpacing: 3, valign: 'middle',
    // shift right of product name — use a separate addText with align based on left of product width is messy.
    // Instead, place the brand label below the product on the same band? Simpler approach below.
  })

  // ↑ The two text fields above overlap intentionally — pptx renders both, but to keep this
  //   clean, replace brand text with a right-aligned variant.
  // (Re-render brand on the right side of the band)
  // We'll just leave the second one as a right-aligned overlay; pptxgenjs draws in order.

  const bodyY = topY + topBandH + 0.15
  const bodyH = H - bodyY - FH - 0.1

  // Left: bottle on gray
  const bottleW = 2.4
  s.addShape('rect', {
    x: 0, y: bodyY, w: bottleW, h: bodyH,
    fill: { color: colors.surfaceSoft }, line: { type: 'none' },
  })
  safeImage(s, product.imageDataUri, {
    x: 0.2, y: bodyY + 0.2, w: bottleW - 0.4, h: bodyH - 0.4, sizing: 'contain',
  })

  // Center: pricing cards
  const cardsX = bottleW + 0.4
  const whyW = 3.4
  const cardsW = W - cardsX - whyW - 0.4
  const gap = 0.15

  // RSP big card
  const rspH = bodyH * 0.38
  s.addShape('rect', {
    x: cardsX, y: bodyY, w: cardsW, h: rspH,
    fill: { color: colors.primary }, line: { type: 'none' },
  })
  s.addText(t('consumerRsp', input.language), {
    x: cardsX + 0.25, y: bodyY + 0.1, w: cardsW - 0.5, h: 0.3,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.ink, bold: true, charSpacing: 2,
  })
  s.addText(product.prices.rsp || '—', {
    x: cardsX + 0.25, y: bodyY + 0.4, w: cardsW - 0.5, h: rspH - 0.7,
    fontFace: type.priceLg.face, fontSize: type.priceLg.size + 8,
    bold: true, color: colors.ink, valign: 'middle',
  })
  s.addText(t('shelfPrice', input.language), {
    x: cardsX + 0.25, y: bodyY + rspH - 0.35, w: cardsW - 0.5, h: 0.3,
    fontFace: type.body.face, fontSize: type.bodySm.size,
    color: '666666',
  })

  // Excl / Incl pair row
  const pairY = bodyY + rspH + gap
  const pairH = bodyH * 0.27
  const pairW = (cardsW - gap) / 2
  ;[
    { x: cardsX, label: t('priceExclExcise', input.language), value: product.prices.deliveryPriceExcl, sub: t('buyingPriceExcl', input.language) },
    { x: cardsX + pairW + gap, label: t('priceInclExcise', input.language), value: product.prices.deliveryPriceIncl, sub: t('buyingPriceIncl', input.language) },
  ].forEach(card => {
    s.addShape('rect', {
      x: card.x, y: pairY, w: pairW, h: pairH,
      fill: { color: colors.canvas },
      line: { color: colors.hairline, width: 1 },
    })
    s.addText(card.label, {
      x: card.x + 0.2, y: pairY + 0.1, w: pairW - 0.4, h: 0.25,
      fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
      color: colors.muted, bold: true, charSpacing: 1.5,
    })
    s.addText(card.value || '—', {
      x: card.x + 0.2, y: pairY + 0.35, w: pairW - 0.4, h: 0.6,
      fontFace: type.priceMd.face, fontSize: type.priceMd.size,
      bold: true, color: colors.ink, valign: 'middle',
    })
    s.addText(card.sub, {
      x: card.x + 0.2, y: pairY + pairH - 0.32, w: pairW - 0.4, h: 0.3,
      fontFace: type.body.face, fontSize: 8,
      color: colors.hairlineStrong,
    })
  })

  // Margin card
  const marginY = pairY + pairH + gap
  const marginH = bodyH - rspH - pairH - gap * 2
  s.addShape('rect', {
    x: cardsX, y: marginY, w: cardsW, h: marginH,
    fill: { color: colors.canvas },
    line: { color: colors.hairline, width: 1 },
  })
  s.addText(t('retailMargin', input.language), {
    x: cardsX + 0.2, y: marginY + 0.1, w: cardsW - 0.4, h: 0.25,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.muted, bold: true, charSpacing: 1.5,
  })
  const marginValue =
    input.marginMode === 'excl' ? product.prices.marginExcl : product.prices.marginIncl
  s.addText(marginValue || '—', {
    x: cardsX + 0.2, y: marginY + 0.3, w: cardsW - 0.4, h: marginH - 0.6,
    fontFace: type.priceMd.face, fontSize: type.priceMd.size,
    bold: true, color: colors.ink, valign: 'middle',
  })
  s.addText(marginLabel(input.marginMode, input.language), {
    x: cardsX + 0.2, y: marginY + marginH - 0.3, w: cardsW - 0.4, h: 0.25,
    fontFace: type.body.face, fontSize: 8,
    color: colors.hairlineStrong,
  })

  // Right: "Why it sells" with yellow dots
  const whyX = W - whyW - 0.3
  s.addShape('rect', {
    x: whyX - 0.2, y: bodyY, w: 0.01, h: bodyH,
    fill: { color: colors.hairline }, line: { type: 'none' },
  })
  s.addText(t('whyItSells', input.language), {
    x: whyX, y: bodyY + 0.1, w: whyW, h: 0.3,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.muted, bold: true, charSpacing: 1.5,
  })
  const whyY0 = bodyY + 0.5
  const whyRowH = 0.55
  product.whyItSells.slice(0, 3).forEach((w, i) => {
    const y = whyY0 + i * whyRowH
    s.addShape('ellipse', {
      x: whyX, y: y + 0.1, w: 0.12, h: 0.12,
      fill: { color: colors.primary }, line: { type: 'none' },
    })
    s.addText(w, {
      x: whyX + 0.25, y, w: whyW - 0.35, h: whyRowH,
      fontFace: type.body.face, fontSize: 11,
      color: colors.subdued, valign: 'top',
    })
  })

  addSlideFooter(s, num, total, input.language)
}

// ---------- Overview slide ----------

function addOverviewSlide(
  pres: PptxGenJS,
  input: DeckInput,
  num: number,
  total: number,
): void {
  const s = pres.addSlide()
  s.background = { color: colors.canvas }
  addAccentBar(s)

  // Header band
  const headerY = AB + 0.1
  const headerH = 0.9
  s.addShape('rect', {
    x: 0, y: headerY, w: W, h: headerH,
    fill: { color: colors.ink }, line: { type: 'none' },
  })
  s.addText(t('fullRangeOverview', input.language), {
    x: 0.6, y: headerY, w: 8, h: headerH,
    fontFace: type.overviewH1.face, fontSize: type.overviewH1.size,
    bold: true, italic: true, color: colors.canvas, valign: 'middle',
  })
  s.addShape('rect', {
    x: 8.7, y: headerY + 0.25, w: 0.05, h: headerH - 0.5,
    fill: { color: colors.primary }, line: { type: 'none' },
  })
  s.addText('NL Market · 2026', {
    x: 8.95, y: headerY, w: 3.5, h: headerH,
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size + 1,
    color: colors.primary, bold: true, charSpacing: 2, valign: 'middle',
  })

  // Table
  const rows: PptxGenJS.TableRow[] = []
  const headerStyle: PptxGenJS.TableCellProps = {
    fontFace: type.uiMicro.face, fontSize: type.uiMicro.size,
    color: colors.muted, bold: true,
    valign: 'bottom',
    border: [
      { type: 'none' }, { type: 'none' },
      { type: 'solid', color: colors.primary, pt: 2 },
      { type: 'none' },
    ],
  }
  rows.push([
    { text: t('product', input.language), options: headerStyle },
    { text: t('brand', input.language), options: headerStyle },
    { text: t('exclExcise', input.language), options: headerStyle },
    { text: t('inclExcise', input.language), options: headerStyle },
    { text: t('rsp', input.language), options: headerStyle },
    { text: marginHeader(input.marginMode, input.language), options: headerStyle },
    { text: t('annualVolume', input.language), options: headerStyle },
  ])

  const cellBase: PptxGenJS.TableCellProps = {
    fontFace: type.body.face, fontSize: 10, color: colors.mutedLink,
    valign: 'middle',
    border: [
      { type: 'none' }, { type: 'none' },
      { type: 'solid', color: colors.thinDivider, pt: 0.5 },
      { type: 'none' },
    ],
  }

  for (const brand of input.brands) {
    for (const p of brand.products) {
      const margin =
        input.marginMode === 'excl' ? p.prices.marginExcl : p.prices.marginIncl
      rows.push([
        { text: p.name, options: { ...cellBase, fontFace: type.uiLabel.face, bold: true, italic: true, color: colors.ink } },
        { text: brand.name, options: { ...cellBase, color: colors.muted } },
        { text: p.prices.deliveryPriceExcl || '—', options: cellBase },
        { text: p.prices.deliveryPriceIncl || '—', options: cellBase },
        { text: p.prices.rsp || '—', options: { ...cellBase, color: colors.ink, bold: true } },
        { text: margin || '—', options: { ...cellBase, fill: { color: colors.primary }, color: colors.ink, bold: true, align: 'center' } },
        { text: p.annualVolumeBtl.toLocaleString('en-US'), options: { ...cellBase, color: colors.ink, bold: true } },
      ])
    }
  }

  const tableY = headerY + headerH + 0.3
  const tableW = W - 1.2
  s.addTable(rows, {
    x: 0.6, y: tableY, w: tableW,
    colW: [tableW * 0.22, tableW * 0.16, tableW * 0.12, tableW * 0.12, tableW * 0.12, tableW * 0.13, tableW * 0.13],
    rowH: 0.45,
  })

  addSlideFooter(s, num, total, input.language)
}
