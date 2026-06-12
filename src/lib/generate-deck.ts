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
.ctrl-sep { width: 1px; background: #2a2a2a; margin: 0 4px; }
.ctrl-label { font-size: 8px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #444; align-self: center; margin-right: 4px; }

.slide { width: 640px; height: 360px; position: relative; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.8); flex-shrink: 0; margin-bottom: 24px; page-break-after: always; }

.accent-bar { position: absolute; top: 0; left: 0; right: 0; height: 5px; background: #f8d418; z-index: 10; }
.slide-footer { position: absolute; bottom: 0; left: 0; right: 0; height: 22px; background: #000; display: flex; align-items: center; padding: 0 20px; justify-content: space-between; z-index: 10; }
.slide-footer .sf-brand { font-size: 7px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #555; }
.slide-footer .sf-brand span { color: #f8d418; }
.slide-footer .sf-num { font-size: 7px; letter-spacing: 1px; color: #333; }

.s-title { background: #000; display: grid; grid-template-columns: 48% 1fr; }
.s-title .left { display: flex; flex-direction: column; justify-content: space-between; padding: 28px 36px 40px 36px; position: relative; z-index: 2; }
.s-title .left::after { content: ''; position: absolute; top: 16%; bottom: 14%; right: 0; width: 4px; background: #f8d418; }
.s-title .eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #f8d418; margin-bottom: 10px; }
.s-title h1 { font-size: 34px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #fff; line-height: 0.95; letter-spacing: -1px; margin-bottom: 12px; }
.s-title .subtitle { font-size: 11px; color: #555; font-family: 'Courier New', monospace; line-height: 1.7; max-width: 210px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }
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

.s-brand-intro { background: #fff; display: grid; grid-template-columns: 45% 1fr; }
.s-brand-intro .bi-left { position: relative; overflow: hidden; }
.s-brand-intro .bi-left img { width: 100%; height: 100%; object-fit: cover; }
.s-brand-intro .bi-overlay { position: absolute; inset: 0; background: linear-gradient(to right, transparent 70%, rgba(255,255,255,0.6)); }
.s-brand-intro .bi-right { display: flex; flex-direction: column; justify-content: center; padding: 24px 28px; }
.s-brand-intro .bi-label { font-size: 8px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #aaa; margin-bottom: 8px; }
.s-brand-intro h2 { font-size: 22px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #000; line-height: 1.0; letter-spacing: -0.5px; margin-bottom: 10px; }
.s-brand-intro .bi-intro { font-size: 11px; color: #444; font-family: 'Courier New', monospace; line-height: 1.65; margin-bottom: 8px; }
.s-brand-intro .bi-desc { font-size: 10px; color: #888; font-family: 'Courier New', monospace; line-height: 1.6; }

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

.s-pricing { background: #fff; display: flex; flex-direction: column; }
.s-pricing .top-band { background: #000; padding: 11px 24px; display: flex; align-items: baseline; gap: 14px; }
.s-pricing .pname { font-size: 14px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #fff; }
.s-pricing .bname { font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #f8d418; }
.s-pricing .body { flex: 1; display: flex; margin-bottom: 22px; }
.s-pricing .bottle-zone { width: 110px; background: #f6f6f6; display: flex; align-items: center; justify-content: center; padding: 10px 8px; border-right: 1px solid #eee; }
.s-pricing .bottle-zone img { max-height: 100%; max-width: 100%; object-fit: contain; }
.s-pricing .numbers { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 14px 12px; }
.s-pricing .prow { display: flex; gap: 6px; }
.s-pricing .prow .pcard { flex: 1; }
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
var _marginMode = 'excl';
var _lang = 'en';

function setLang(lang) {
  _lang = lang;
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
  document.querySelectorAll('[data-en]').forEach(el => {
    const t = el.getAttribute('data-' + lang);
    if (t !== null) el.innerHTML = t;
  });
  // Re-apply margin method label in new language
  document.querySelectorAll('.margin-method').forEach(el => {
    const t = el.getAttribute('data-' + _marginMode + '-' + lang);
    if (t !== null) el.textContent = t;
  });
  document.querySelectorAll('.margin-header').forEach(el => {
    const t = el.getAttribute('data-' + _marginMode + '-' + lang);
    if (t !== null) el.textContent = t;
  });
  document.documentElement.lang = lang;
}

function setMarginMode(mode) {
  _marginMode = mode;
  document.querySelectorAll('.margin-mode-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.margin === mode)
  );
  document.querySelectorAll('.margin-val').forEach(el => {
    el.textContent = el.getAttribute('data-' + mode) || '–';
  });
  document.querySelectorAll('.margin-method').forEach(el => {
    const t = el.getAttribute('data-' + mode + '-' + _lang);
    if (t !== null) el.textContent = t;
  });
  document.querySelectorAll('.margin-header').forEach(el => {
    const t = el.getAttribute('data-' + mode + '-' + _lang);
    if (t !== null) el.textContent = t;
  });
}
`

export function buildDeck(data: DeckData, pdcLogoUri: string): string {
  const slides: string[] = []

  // total: per brand = 1 title + 1 brand intro + (2 per product), + 1 overview
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
  <div class="ctrl-sep"></div>
  <span class="ctrl-label">Margin</span>
  <button class="lang-btn margin-mode-btn active" data-margin="excl" onclick="setMarginMode('excl')">Excl.</button>
  <button class="lang-btn margin-mode-btn" data-margin="incl" onclick="setMarginMode('incl')">Incl.</button>
</div>
${slides.join('\n')}
<script>${TOGGLE_JS}setLang('${initialLang}');</script>
</body>
</html>`
}
