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
      <div class="pcard hl">
        <div class="pl" data-en="Consumer RSP" data-nl="Consumentenadviesprijs">Consumer RSP</div>
        <div class="pv">${escHtml(product.prices.rsp)}</div>
        <div class="ps" data-en="Shelf price · incl. VAT 21%" data-nl="Winkelprijs · incl. BTW 21%">Shelf price · incl. VAT 21%</div>
      </div>
      <div class="prow">
        <div class="pcard">
          <div class="pl" data-en="Price Excl. Excise" data-nl="Prijs Excl. Accijns">Price Excl. Excise</div>
          <div class="pv">${escHtml(product.prices.deliveryPriceExcl)}</div>
          <div class="ps" data-en="Buying price · excl. duty" data-nl="Inkoopprijs · excl. accijns">Buying price · excl. duty</div>
        </div>
        <div class="pcard">
          <div class="pl" data-en="Price Incl. Excise" data-nl="Prijs Incl. Accijns">Price Incl. Excise</div>
          <div class="pv">${escHtml(product.prices.deliveryPriceIncl)}</div>
          <div class="ps" data-en="Buying price · incl. duty" data-nl="Inkoopprijs · incl. accijns">Buying price · incl. duty</div>
        </div>
      </div>
      <div class="pcard">
        <div class="pl" data-en="Your Retail Margin" data-nl="Retailmarge">Your Retail Margin</div>
        <div class="pv margin-val" data-excl="${escHtml(product.prices.marginExcl)}" data-incl="${escHtml(product.prices.marginIncl)}">${escHtml(product.prices.marginExcl)}</div>
        <div class="ps margin-method"
          data-excl-en="Calculated on excl. excise" data-excl-nl="Op basis van excl. accijns"
          data-incl-en="Calculated on incl. excise" data-incl-nl="Op basis van incl. accijns">Calculated on excl. excise</div>
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
      <td>${escHtml(p.prices.deliveryPriceExcl)}</td>
      <td>${escHtml(p.prices.deliveryPriceIncl)}</td>
      <td class="rsp-val">${escHtml(p.prices.rsp)}</td>
      <td><span class="mpill margin-val" data-excl="${escHtml(p.prices.marginExcl)}" data-incl="${escHtml(p.prices.marginIncl)}">${escHtml(p.prices.marginExcl)}</span></td>
      <td class="vol-val">${p.annual_volume_btl.toLocaleString('en-US')}</td>
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
        <th data-en="Excl. Excise" data-nl="Excl. Accijns">Excl. Excise</th>
        <th data-en="Incl. Excise" data-nl="Incl. Accijns">Incl. Excise</th>
        <th data-en="RSP" data-nl="Adv. Prijs">RSP</th>
        <th class="margin-header" data-excl-en="Margin Excl." data-excl-nl="Marge Excl." data-incl-en="Margin Incl." data-incl-nl="Marge Incl.">Margin Excl.</th>
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
