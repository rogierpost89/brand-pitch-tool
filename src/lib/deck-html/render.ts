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
  if (face === type.body.face) return '"Courier New", monospace'                  // body
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

function section(bg: string, inner: string): string {
  return `<section class="slide" style="background:${c(bg)};">${inner}</section>`
}

// ---------- Shared helpers ----------

function accentBar(): string {
  return rect({ x: 0, y: 0, w: W, h: AB }, { fill: colors.primary })
}

function slideFooter(num: number, total: number, lang: Language): string {
  let out = ''
  // Black footer band
  out += rect({ x: 0, y: H - FH, w: W, h: FH }, { fill: colors.ink })
  // "Pineapple Drinks Club" two-color text
  const pdcText =
    `<span style="color:${c(colors.mutedLink)};">Pineapple </span>` +
    `<span style="color:${c(colors.primary)};">Drinks Club</span>`
  out += text(pdcText, { x: 0.3, y: H - FH, w: 4, h: FH },
    { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
    { color: colors.mutedLink, valign: 'middle', charSpacing: 2 })
  // Page number
  out += text(
    `${String(num).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
    { x: W - 1.5, y: H - FH, w: 1.2, h: FH },
    { size: type.uiMicro.size, face: type.uiMicro.face },
    { color: colors.subdued, align: 'right', valign: 'middle' },
  )
  void lang
  return out
}

// ---------- Title slide ----------

function titleSlide(input: DeckInput, brand: BrandSlot, num: number, total: number): string {
  const splitX = W * 0.48
  const titleFooterH = 0.55
  const padX = 0.6

  let out = accentBar()

  // Right: hero image (covers right side)
  out += image(brand.images.heroDataUri, { x: splitX, y: 0, w: W - splitX, h: H - titleFooterH }, 'cover')

  // Vertical yellow line at split
  out += rect({ x: splitX - 0.04, y: H * 0.16, w: 0.04, h: H * 0.55 }, { fill: colors.primary })

  // Eyebrow
  out += text(esc(t('pitchEyebrow', input.language)), { x: padX, y: 0.6, w: splitX - padX * 2, h: 0.3 },
    { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
    { color: colors.primary, charSpacing: 3 })

  // Brand headline
  out += text(esc(brand.name), { x: padX, y: 1.0, w: splitX - padX * 2, h: 1.8 },
    { size: type.displayHero.size, bold: true, italic: true, face: type.displayHero.face },
    { color: colors.canvas, valign: 'top' })

  // Subtitle (mono description)
  out += text(esc(brand.description || brand.intro), { x: padX, y: 2.9, w: splitX - padX * 2, h: 2.0 },
    { size: type.body.size, face: type.body.face },
    { color: colors.mutedLink, valign: 'top' })

  // Logo row (bottom of left panel)
  const logoRowY = H - titleFooterH - 1.3
  out += text(esc(t('presentedBy', input.language)), { x: padX, y: logoRowY, w: 2, h: 0.2 },
    { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
    { color: colors.subdued, charSpacing: 2 })
  out += image(input.pdcLogoDataUri, { x: padX, y: logoRowY + 0.25, w: 2.0, h: 0.55 }, 'contain')
  // Brand logo (right-aligned in left panel)
  out += image(brand.images.logoDataUri, { x: splitX - 2.5 - padX, y: logoRowY + 0.1, w: 2.5, h: 0.75 }, 'contain')

  // Title footer band
  out += rect({ x: 0, y: H - titleFooterH, w: W, h: titleFooterH }, { fill: '0A0A0A' })
  out += text(esc(t('preparedFor', input.language)),
    { x: padX, y: H - titleFooterH + 0.05, w: 2.5, h: 0.2 },
    { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
    { color: colors.subdued, charSpacing: 1.5 })
  out += text(esc(`${input.buyer.company}  ·  ${input.buyer.contact}`),
    { x: padX, y: H - titleFooterH + 0.25, w: 6, h: 0.25 },
    { size: type.uiLabel.size, bold: true, face: type.uiLabel.face },
    { color: colors.canvas, charSpacing: 1 })
  out += text(esc(t('confidential', input.language)),
    { x: W - 4 - padX, y: H - titleFooterH + 0.15, w: 4, h: 0.25 },
    { size: type.uiMicro.size, face: type.uiMicro.face },
    { color: colors.subdued, align: 'right', charSpacing: 1 })

  // No standard footer on title (it has its own footer band)
  void num
  void total
  return section(colors.ink, out)
}

// ---------- Brand intro ----------

function brandIntroSlide(input: DeckInput, brand: BrandSlot, num: number, total: number): string {
  let out = accentBar()

  const splitX = W * 0.45
  const bodyY = AB + 0.1
  const bodyH = H - bodyY - FH

  // Left: hero image
  out += image(brand.images.heroDataUri, { x: 0, y: bodyY, w: splitX, h: bodyH }, 'cover')

  // Right: content
  const rPadX = 0.6
  const rX = splitX + rPadX
  const rW = W - rX - rPadX

  out += text(esc(t('aboutTheBrand', input.language)), { x: rX, y: bodyY + 0.6, w: rW, h: 0.3 },
    { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
    { color: colors.muted, charSpacing: 3 })
  out += text(esc(brand.name), { x: rX, y: bodyY + 1.0, w: rW, h: 1.2 },
    { size: type.brandH1.size, bold: true, italic: true, face: type.brandH1.face },
    { color: colors.ink })
  out += text(esc(brand.intro), { x: rX, y: bodyY + 2.3, w: rW, h: 1.4 },
    { size: type.body.size, face: type.body.face },
    { color: colors.subdued, valign: 'top' })
  out += text(esc(brand.description), { x: rX, y: bodyY + 3.8, w: rW, h: 1.6 },
    { size: type.body.size - 1, face: type.body.face },
    { color: colors.muted, valign: 'top' })

  out += slideFooter(num, total, input.language)
  return section(colors.canvas, out)
}

// ---------- Product intro ----------

function productIntroSlide(input: DeckInput, brand: BrandSlot, product: ProductSlot, num: number, total: number): string {
  let out = accentBar()

  const imgPanelW = W * 0.40
  const bodyY = AB + 0.1
  const bodyH = H - bodyY - FH

  // Left: gray panel with product image + yellow accent strip
  out += rect({ x: 0, y: bodyY, w: imgPanelW, h: bodyH }, { fill: colors.surfaceSoft })
  out += image(product.imageDataUri, { x: 0.3, y: bodyY + 0.3, w: imgPanelW - 0.6, h: bodyH - 0.6 }, 'contain')
  out += rect({ x: imgPanelW - 0.05, y: bodyY, w: 0.05, h: bodyH }, { fill: colors.primary })

  // Right: content
  const rPadX = 0.55
  const rX = imgPanelW + rPadX
  const rW = W - rX - rPadX

  out += text(esc(brand.name), { x: rX, y: bodyY + 0.5, w: rW, h: 0.25 },
    { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
    { color: colors.muted, charSpacing: 3 })
  out += text(esc(product.name), { x: rX, y: bodyY + 0.85, w: rW, h: 1.0 },
    { size: type.productH1.size, bold: true, italic: true, face: type.productH1.face },
    { color: colors.ink })
  out += text(esc(`"${product.tagline}"`), { x: rX, y: bodyY + 1.95, w: rW, h: 0.45 },
    { size: type.body.size, italic: true, face: type.body.face },
    { color: colors.muted })
  out += text(esc(product.intro), { x: rX, y: bodyY + 2.45, w: rW, h: 1.3 },
    { size: type.body.size, face: type.body.face },
    { color: colors.subdued, valign: 'top' })

  // USP cards (yellow left border)
  const uspY0 = bodyY + 3.85
  const uspH = 0.55
  const uspGap = 0.12
  product.usps.slice(0, 3).forEach((u, i) => {
    const y = uspY0 + i * (uspH + uspGap)
    out += rect({ x: rX, y, w: rW, h: uspH }, { fill: colors.surfaceSoft })
    out += rect({ x: rX, y, w: 0.08, h: uspH }, { fill: colors.primary })
    out += text(esc(u), { x: rX + 0.2, y, w: rW - 0.25, h: uspH },
      { size: type.body.size - 1, face: type.body.face },
      { color: colors.subdued, valign: 'middle' })
  })

  out += slideFooter(num, total, input.language)
  return section(colors.canvas, out)
}

// ---------- Pricing slide ----------

function pricingSlide(input: DeckInput, brand: BrandSlot, product: ProductSlot, num: number, total: number): string {
  let out = accentBar()

  const topBandH = 0.7
  const topY = AB + 0.05

  // Black top band with product + brand (brand right-aligned — intentional deviation from source overlap hack)
  out += rect({ x: 0, y: topY, w: W, h: topBandH }, { fill: colors.ink })
  out += text(esc(product.name), { x: 0.6, y: topY, w: 8, h: topBandH },
    { size: 28, bold: true, italic: true, face: type.displayXL.face },
    { color: colors.canvas, valign: 'middle' })
  // Brand label: right-aligned, no overlap hack
  out += text(esc(brand.name), { x: W - 4 - 0.6, y: topY, w: 3.4, h: topBandH },
    { size: type.uiMicro.size + 2, bold: true, face: type.uiMicro.face },
    { color: colors.primary, align: 'right', valign: 'middle', charSpacing: 3 })

  const bodyY = topY + topBandH + 0.15
  const bodyH = H - bodyY - FH - 0.1

  // Left: bottle on gray
  const bottleW = 2.4
  out += rect({ x: 0, y: bodyY, w: bottleW, h: bodyH }, { fill: colors.surfaceSoft })
  out += image(product.imageDataUri, { x: 0.2, y: bodyY + 0.2, w: bottleW - 0.4, h: bodyH - 0.4 }, 'contain')

  // Center: pricing cards
  const cardsX = bottleW + 0.4
  const whyW = 3.4
  const cardsW = W - cardsX - whyW - 0.4
  const gap = 0.15

  // RSP big card
  const rspH = bodyH * 0.38
  out += rect({ x: cardsX, y: bodyY, w: cardsW, h: rspH }, { fill: colors.primary })
  out += text(esc(t('consumerRsp', input.language)), { x: cardsX + 0.25, y: bodyY + 0.1, w: cardsW - 0.5, h: 0.3 },
    { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
    { color: colors.ink, charSpacing: 2 })
  out += text(esc(product.prices.rsp || '—'), { x: cardsX + 0.25, y: bodyY + 0.4, w: cardsW - 0.5, h: rspH - 0.7 },
    { size: type.priceLg.size + 8, bold: true, face: type.priceLg.face },
    { color: colors.ink, valign: 'middle' })
  out += text(esc(t('shelfPrice', input.language)), { x: cardsX + 0.25, y: bodyY + rspH - 0.35, w: cardsW - 0.5, h: 0.3 },
    { size: type.bodySm.size, face: type.body.face },
    { color: '666666' })

  // Excl / Incl pair row
  const pairY = bodyY + rspH + gap
  const pairH = bodyH * 0.27
  const pairW = (cardsW - gap) / 2
  ;[
    { x: cardsX, label: t('priceExclExcise', input.language), value: product.prices.deliveryPriceExcl, sub: t('buyingPriceExcl', input.language) },
    { x: cardsX + pairW + gap, label: t('priceInclExcise', input.language), value: product.prices.deliveryPriceIncl, sub: t('buyingPriceIncl', input.language) },
  ].forEach(card => {
    out += rect({ x: card.x, y: pairY, w: pairW, h: pairH }, { fill: colors.canvas, borderColor: colors.hairline, borderPt: 1 })
    out += text(esc(card.label), { x: card.x + 0.2, y: pairY + 0.1, w: pairW - 0.4, h: 0.25 },
      { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
      { color: colors.muted, charSpacing: 1.5 })
    out += text(esc(card.value || '—'), { x: card.x + 0.2, y: pairY + 0.35, w: pairW - 0.4, h: 0.6 },
      { size: type.priceMd.size, bold: true, face: type.priceMd.face },
      { color: colors.ink, valign: 'middle' })
    out += text(esc(card.sub), { x: card.x + 0.2, y: pairY + pairH - 0.32, w: pairW - 0.4, h: 0.3 },
      { size: 8, face: type.body.face },
      { color: colors.hairlineStrong })
  })

  // Margin card
  const marginY = pairY + pairH + gap
  const marginH = bodyH - rspH - pairH - gap * 2
  out += rect({ x: cardsX, y: marginY, w: cardsW, h: marginH }, { fill: colors.canvas, borderColor: colors.hairline, borderPt: 1 })
  out += text(esc(t('retailMargin', input.language)), { x: cardsX + 0.2, y: marginY + 0.1, w: cardsW - 0.4, h: 0.25 },
    { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
    { color: colors.muted, charSpacing: 1.5 })
  const marginValue =
    input.marginMode === 'excl' ? product.prices.marginExcl : product.prices.marginIncl
  out += text(esc(marginValue || '—'), { x: cardsX + 0.2, y: marginY + 0.3, w: cardsW - 0.4, h: marginH - 0.6 },
    { size: type.priceMd.size, bold: true, face: type.priceMd.face },
    { color: colors.ink, valign: 'middle' })
  out += text(esc(marginLabel(input.marginMode, input.language)), { x: cardsX + 0.2, y: marginY + marginH - 0.3, w: cardsW - 0.4, h: 0.25 },
    { size: 8, face: type.body.face },
    { color: colors.hairlineStrong })

  // Right: "Why it sells" with yellow dots
  const whyX = W - whyW - 0.3
  out += rect({ x: whyX - 0.2, y: bodyY, w: 0.01, h: bodyH }, { fill: colors.hairline })
  out += text(esc(t('whyItSells', input.language)), { x: whyX, y: bodyY + 0.1, w: whyW, h: 0.3 },
    { size: type.uiMicro.size, bold: true, face: type.uiMicro.face },
    { color: colors.muted, charSpacing: 1.5 })
  const whyY0 = bodyY + 0.5
  const whyRowH = 0.55
  product.whyItSells.slice(0, 3).forEach((w, i) => {
    const y = whyY0 + i * whyRowH
    out += ellipse({ x: whyX, y: y + 0.1, w: 0.12, h: 0.12 }, colors.primary)
    out += text(esc(w), { x: whyX + 0.25, y, w: whyW - 0.35, h: whyRowH },
      { size: 11, face: type.body.face },
      { color: colors.subdued, valign: 'top' })
  })

  out += slideFooter(num, total, input.language)
  return section(colors.canvas, out)
}

// ---------- Overview slide ----------

function overviewSlide(input: DeckInput, num: number, total: number): string {
  let out = accentBar()

  // Header band
  const headerY = AB + 0.1
  const headerH = 0.9
  out += rect({ x: 0, y: headerY, w: W, h: headerH }, { fill: colors.ink })
  out += text(esc(t('fullRangeOverview', input.language)), { x: 0.6, y: headerY, w: 8, h: headerH },
    { size: type.overviewH1.size, bold: true, italic: true, face: type.overviewH1.face },
    { color: colors.canvas, valign: 'middle' })
  out += rect({ x: 8.7, y: headerY + 0.25, w: 0.05, h: headerH - 0.5 }, { fill: colors.primary })
  out += text('NL Market · 2026', { x: 8.95, y: headerY, w: 3.5, h: headerH },
    { size: type.uiMicro.size + 1, bold: true, face: type.uiMicro.face },
    { color: colors.primary, charSpacing: 2, valign: 'middle' })

  // Table
  const tableY = headerY + headerH + 0.3
  const tableW = W - 1.2
  const colW = [tableW * 0.22, tableW * 0.16, tableW * 0.12, tableW * 0.12, tableW * 0.12, tableW * 0.13, tableW * 0.13]

  const hdrFont = `font-family:${cssFont(type.uiMicro.face)};font-size:${type.uiMicro.size}pt;font-weight:700;color:${c(colors.muted)};`
  const hdrBorder = `border-bottom:2px solid ${c(colors.primary)};`
  const cellBorder = `border-bottom:1px solid ${c(colors.thinDivider)};`
  const rowH = 0.45

  const headers = [
    t('product', input.language),
    t('brand', input.language),
    t('exclExcise', input.language),
    t('inclExcise', input.language),
    t('rsp', input.language),
    marginHeader(input.marginMode, input.language),
    t('annualVolume', input.language),
  ]

  const allProducts = input.brands.flatMap(b => b.products.map(p => ({ brand: b, product: p })))

  let tableHtml = `<table style="position:absolute;left:0.6in;top:${tableY}in;width:${tableW}in;border-collapse:collapse;table-layout:fixed;">`

  // Col widths
  tableHtml += '<colgroup>'
  colW.forEach(w => {
    tableHtml += `<col style="width:${w}in;">`
  })
  tableHtml += '</colgroup>'

  // Header row
  tableHtml += '<thead><tr>'
  headers.forEach(h => {
    tableHtml += `<th style="${hdrFont}${hdrBorder}padding:4px 6px;text-align:left;vertical-align:bottom;">${esc(h)}</th>`
  })
  tableHtml += '</tr></thead>'

  // Body rows
  tableHtml += '<tbody>'
  allProducts.forEach(({ brand, product }) => {
    const margin = input.marginMode === 'excl' ? product.prices.marginExcl : product.prices.marginIncl
    const bodyFont = `font-family:${cssFont(type.body.face)};font-size:10pt;`
    const uiFont = `font-family:${cssFont(type.uiLabel.face)};font-size:${type.uiLabel.size}pt;`
    tableHtml += `<tr style="height:${rowH}in;">`
    tableHtml += `<td style="${uiFont}font-weight:700;font-style:italic;color:${c(colors.ink)};${cellBorder}padding:4px 6px;">${esc(product.name)}</td>`
    tableHtml += `<td style="${bodyFont}color:${c(colors.muted)};${cellBorder}padding:4px 6px;">${esc(brand.name)}</td>`
    tableHtml += `<td style="${bodyFont}color:${c(colors.mutedLink)};${cellBorder}padding:4px 6px;">${esc(product.prices.deliveryPriceExcl || '—')}</td>`
    tableHtml += `<td style="${bodyFont}color:${c(colors.mutedLink)};${cellBorder}padding:4px 6px;">${esc(product.prices.deliveryPriceIncl || '—')}</td>`
    tableHtml += `<td style="${bodyFont}font-weight:700;color:${c(colors.ink)};${cellBorder}padding:4px 6px;">${esc(product.prices.rsp || '—')}</td>`
    tableHtml += `<td style="${bodyFont}font-weight:700;color:${c(colors.ink)};background:${c(colors.primary)};${cellBorder}padding:4px 6px;text-align:center;">${esc(margin || '—')}</td>`
    tableHtml += `<td style="${bodyFont}font-weight:700;color:${c(colors.ink)};${cellBorder}padding:4px 6px;">${esc(product.annualVolumeBtl.toLocaleString('en-US'))}</td>`
    tableHtml += '</tr>'
  })
  tableHtml += '</tbody></table>'

  out += tableHtml
  out += slideFooter(num, total, input.language)
  return section(colors.canvas, out)
}

// ---------- Main export ----------

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
