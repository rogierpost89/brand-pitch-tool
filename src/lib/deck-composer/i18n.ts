import type { Language, MarginMode } from '@/lib/deck-template/types'

type Dict = Record<string, { en: string; nl: string }>

const STRINGS: Dict = {
  pitchEyebrow:       { en: 'Product Pitch · NL Market · 2026', nl: 'Productpresentatie · NL Markt · 2026' },
  presentedBy:        { en: 'Presented by',                     nl: 'Gepresenteerd door' },
  preparedFor:        { en: 'Prepared for',                     nl: 'Voor' },
  confidential:       { en: 'Confidential · Trade use only',    nl: 'Vertrouwelijk · Alleen voor handel' },
  aboutTheBrand:      { en: 'About the brand',                  nl: 'Over het merk' },
  whyItSells:         { en: 'Why it sells',                     nl: 'Waarom het verkoopt' },
  consumerRsp:        { en: 'Consumer RSP',                     nl: 'Consumentenadviesprijs' },
  shelfPrice:         { en: 'Shelf price · incl. VAT 21%',      nl: 'Winkelprijs · incl. BTW 21%' },
  priceExclExcise:    { en: 'Price excl. Excise',               nl: 'Prijs excl. Accijns' },
  priceInclExcise:    { en: 'Price incl. Excise',               nl: 'Prijs incl. Accijns' },
  buyingPriceExcl:    { en: 'Buying price · excl. duty',        nl: 'Inkoopprijs · excl. accijns' },
  buyingPriceIncl:    { en: 'Buying price · incl. duty',        nl: 'Inkoopprijs · incl. accijns' },
  retailMargin:       { en: 'Your Retail Margin',               nl: 'Retailmarge' },
  marginOnExcl:       { en: 'Calculated on excl. excise',       nl: 'Op basis van excl. accijns' },
  marginOnIncl:       { en: 'Calculated on incl. excise',       nl: 'Op basis van incl. accijns' },
  fullRangeOverview:  { en: 'Full Range Overview',              nl: 'Volledig Assortiment' },
  product:            { en: 'Product',                          nl: 'Product' },
  brand:              { en: 'Brand',                            nl: 'Merk' },
  exclExcise:         { en: 'Excl. Excise',                     nl: 'Excl. Accijns' },
  inclExcise:         { en: 'Incl. Excise',                     nl: 'Incl. Accijns' },
  rsp:                { en: 'RSP',                              nl: 'Adv. Prijs' },
  marginExclHeader:   { en: 'Margin Excl.',                     nl: 'Marge Excl.' },
  marginInclHeader:   { en: 'Margin Incl.',                     nl: 'Marge Incl.' },
  annualVolume:       { en: 'Annual Vol (btl)',                 nl: 'Jaarl. Vol (fl)' },
  pdcBrand:           { en: 'Pineapple Drinks Club',            nl: 'Pineapple Drinks Club' },
}

export function t(key: keyof typeof STRINGS, lang: Language): string {
  return STRINGS[key][lang]
}

export function marginLabel(mode: MarginMode, lang: Language): string {
  return mode === 'excl' ? t('marginOnExcl', lang) : t('marginOnIncl', lang)
}

export function marginHeader(mode: MarginMode, lang: Language): string {
  return mode === 'excl' ? t('marginExclHeader', lang) : t('marginInclHeader', lang)
}
