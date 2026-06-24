/**
 * Pineapple Drinks Club design tokens — the single source of styling for every pitch deck.
 *
 * Derived from examples/pineapple-drinks-club.md. NEVER hardcode colors, fonts, or sizes
 * outside this file — the rule "every deck uses the PDC house style" is enforced by routing
 * all styling through these tokens.
 *
 * Colors are PPTX hex (no leading #). Sizes are PPTX-native units:
 *   - distances in inches (pptxgenjs default)
 *   - font sizes in points
 */

export const colors = {
  primary: 'F8D418',          // PDC Yellow
  primaryHover: 'D4B010',
  ink: '000000',
  canvas: 'FFFFFF',
  surfaceSoft: 'F6F6F6',
  hairline: 'EBEBEB',
  hairlineStrong: 'E2E2E2',
  muted: '999999',
  mutedLink: '666666',
  bodyOnDark: 'FFFFFF',
  bodyOnLight: '000000',
  contactBand: '1C1C1C',
  subdued: '444444',
  thinDivider: 'F0F0F0',
} as const

/**
 * Font choices.
 *
 * The brand's actual fonts (Nexa Heavy Italic, Miriam Fixed, ITC Eras) are commercial /
 * non-standard. For PPTX portability we use the documented substitutes from the design
 * system's "Font Substitutes for Presentations" section, falling back to fonts bundled
 * with macOS + Windows + Office.
 */
export const fonts = {
  display: 'Impact',          // for Nexa Heavy Italic — universally available
  body: 'Courier New',        // for Miriam Fixed — monospace, ships everywhere
  ui: 'Gill Sans MT',         // for ITC Eras / Gill Sans — bundled with Office on Mac+Win
} as const

/** Slide canvas — 16:9 widescreen, 13.333" x 7.5". */
export const slide = {
  widthIn: 13.333,
  heightIn: 7.5,
  marginIn: 0.5,
  accentBarHeightIn: 0.08,
  footerHeightIn: 0.32,
} as const

/** Typography scale in points (pptxgenjs uses pt for fontSize). */
export const type = {
  displayHero: { size: 60, bold: true, italic: true, face: fonts.display },
  displayXL:   { size: 40, bold: true, italic: true, face: fonts.display },
  productH1:   { size: 36, bold: true, italic: true, face: fonts.display },
  brandH1:     { size: 32, bold: true, italic: true, face: fonts.display },
  overviewH1:  { size: 28, bold: true, italic: true, face: fonts.display },

  bodyLg:      { size: 14, bold: false, italic: false, face: fonts.body },
  body:        { size: 12, bold: false, italic: false, face: fonts.body },
  bodySm:      { size: 10, bold: false, italic: false, face: fonts.body },

  priceLg:     { size: 32, bold: true, italic: false, face: fonts.ui },
  priceMd:     { size: 20, bold: true, italic: false, face: fonts.ui },

  uiHeading:   { size: 14, bold: true, italic: false, face: fonts.ui },
  uiLabel:     { size: 10, bold: true, italic: false, face: fonts.ui },
  uiCaption:   { size: 9,  bold: false, italic: false, face: fonts.ui },
  uiMicro:     { size: 7,  bold: true, italic: false, face: fonts.ui },
} as const

export type FontStyle = (typeof type)[keyof typeof type]
