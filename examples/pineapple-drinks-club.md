---
version: 1.0
name: Pineapple-Drinks-Club-design-analysis
description: A high-contrast premium spirits marketplace built on pure black and PDC Yellow
  (#f8d418), the single brand voltage that powers every CTA, the active nav state, the
  announcement bar, the logo-band accent, the footer link hover, and the sale badge. Type
  runs three registers that never blur — Nexa Heavy Italic for display headlines, Miriam
  Fixed for all body copy, and ITC Eras Book / Gill Sans for UI labels and product names.
  The macro-layout is duotone triband: a sealed black header stack over a white canvas body,
  with dark editorial bands for contact and footer moments. No gradients, no secondary accent,
  no shadow — depth comes from the black/white/yellow three-way contrast alone.

colors:
  primary: "#f8d418"
  primary-faded: "rgba(248,212,24,0.15)"
  primary-overlay: "rgba(248,212,24,0.85)"
  primary-hover: "#d4b010"
  ink: "#000000"
  heading: "#000000"
  body: "#000000"
  link: "#000000"
  link-hover: "#333333"
  muted: "#999999"
  muted-link: "#666666"
  canvas: "#ffffff"
  surface-soft: "#f6f6f6"
  hairline: "#ebebeb"
  hairline-strong: "#e2e2e2"
  logo-band-bg: "#000000"
  logo-band-text: "#f8d418"
  footer-bg: "#000000"
  footer-text: "#999999"
  footer-link: "#666666"
  footer-link-hover: "#f8d418"
  subfooter-bg: "#f6f6f6"
  on-primary: "#000000"
  on-dark: "#ffffff"
  scrim: "rgba(0,0,0,0.75)"

typography:
  display-hero:
    fontFamily: "'Nexa Heavy', 'Nexa', sans-serif"
    fontSize: ~70px
    fontWeight: 900
    fontStyle: italic
    lineHeight: 1.1
    letterSpacing: -1px
    textTransform: uppercase
  display-xl:
    fontFamily: "'Nexa Heavy', 'Nexa', sans-serif"
    fontSize: ~44px
    fontWeight: 900
    fontStyle: italic
    lineHeight: 1.15
    letterSpacing: -0.5px
  product-detail-title:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 1px
    textTransform: uppercase
  product-title:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~14px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.5px
    textTransform: uppercase
  nav-link:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~14px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0
  body-mono:
    fontFamily: "'Miriam Fixed', 'Courier New', Courier, monospace"
    fontSize: ~14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-mono-sm:
    fontFamily: "'Miriam Fixed', 'Courier New', Courier, monospace"
    fontSize: ~13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  price:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~18px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0
  price-detail:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~24px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0
  caption:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  badge:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~11px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.5px
    textTransform: uppercase
  button-primary:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~14px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: 1px
    textTransform: uppercase
  announcement-text:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~13px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0
  breadcrumb:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~12px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0
  footer-heading:
    fontFamily: "'ITC Eras', 'Gill Sans', sans-serif"
    fontSize: ~11px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.5px
    textTransform: uppercase

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 64px

components:
  announcement-bar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.announcement-text}"
    height: ~36px
    padding: 8px 16px
  logo-header:
    backgroundColor: "{colors.logo-band-bg}"
    textColor: "{colors.logo-band-text}"
    height: ~80px
    padding: 0 32px
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    typography: "{typography.nav-link}"
    height: ~52px
    borderBottom: "1px solid {colors.hairline}"
  nav-link-active:
    textColor: "{colors.primary}"
    typography: "{typography.nav-link}"
  hero-band:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-dark}"
    minHeight: ~520px
    padding: 80px 48px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-primary}"
    rounded: "{rounded.sm}"
    padding: 12px 24px
    height: ~44px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
  button-arrow:
    backgroundColor: transparent
    textColor: "{colors.on-dark}"
    typography: "{typography.button-primary}"
    rounded: "{rounded.xs}"
    padding: 10px 20px
  product-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    rounded: "{rounded.none}"
  product-card-image:
    aspectRatio: "1/1"
    objectFit: contain
    backgroundColor: "{colors.canvas}"
  sale-badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.badge}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  category-sidebar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    typography: "{typography.nav-link}"
  breadcrumb-nav:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography: "{typography.breadcrumb}"
  stock-warning:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.caption}"
  contact-band:
    backgroundColor: "#1c1c1c"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-xl}"
    padding: 64px 48px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    typography: "{typography.body-mono-sm}"
    rounded: "{rounded.xs}"
    padding: 10px 12px
    height: ~40px
    border: "1px solid {colors.hairline}"
  footer:
    backgroundColor: "{colors.footer-bg}"
    textColor: "{colors.footer-text}"
    typography: "{typography.caption}"
    padding: 48px 48px
  footer-heading:
    backgroundColor: transparent
    textColor: "{colors.on-dark}"
    typography: "{typography.footer-heading}"
  footer-link:
    textColor: "{colors.footer-link}"
    typography: "{typography.caption}"
  footer-link-hover:
    textColor: "{colors.footer-link-hover}"
  subfooter:
    backgroundColor: "{colors.subfooter-bg}"
    textColor: "{colors.muted-link}"
    typography: "{typography.caption}"
    padding: 24px 48px
---

## Overview

Pineapple Drinks Club is a premium spirits importer and marketplace whose visual identity
is built entirely on the tension between **pure black** (`{colors.ink}` — #000000) and
**PDC Yellow** (`{colors.primary}` — #f8d418), with white canvas (`{colors.canvas}`) as
the neutral connector. There is no secondary accent color — yellow is the single interactive
signal in the system. It appears on the announcement bar, the active nav state, every CTA
button, the sale badge, the logo-band text accent, and all footer link hover states. Yellow
used anywhere else would dilute the signal; the brand disciplines it to exactly these moments.

The macro page structure is a **sealed triband**: a black header stack (announcement bar +
logo band) on top, a white canvas commerce body in the middle, and a black footer at the
bottom. The contact/pre-footer band breaks the white canvas with a very dark charcoal
(~#1c1c1c), creating a dramatic editorial pause before the footer.

The typographic system runs **three registers** that serve three distinct functions and
never overlap:

1. **Nexa Heavy Italic** (`{typography.display-hero}`, `{typography.display-xl}`) — the
   display voice. Used only for the two major editorial headline moments: the homepage hero
   and the contact-band "WE'RE SOCIAL" headline. Condensed, geometric, heavily italic —
   it carries brand authority and premium urgency.
2. **Miriam Fixed** (`{typography.body-mono}`) — a monospace fixed-width font used for all
   running body copy: hero subtitle, product descriptions, contact copy. The typewriter
   texture signals craft, precision, and artisanal character — an unusual choice for
   e-commerce that sets the brand apart from generic spirits retailers.
3. **ITC Eras Book / Gill Sans** (`{typography.nav-link}`, `{typography.product-title}`,
   `{typography.button-primary}`) — the UI layer. Clean humanist sans-serif for navigation,
   product names, prices, and CTA labels. Always uppercase in label contexts.

Elevation is absent — no card shadows, no button shadows. Depth is achieved through
black/yellow/white contrast alone.

**Key Characteristics:**
- Single accent: `{colors.primary}` (#f8d418) carries all interactivity. Everything else
  is black, white, or dark charcoal.
- Sealed black header: logo sits in a pure black band that brands every page regardless of
  the hero photo below. The yellow star and wordmark accent in the logo fires `{colors.primary}`.
- Three-register type stack: Nexa Heavy Italic (brand authority), Miriam Fixed (craft),
  ITC Eras (function). None bleeds into the other's territory.
- All-uppercase product vocabulary: product names, CTA labels, and nav are all-caps throughout.
- Yellow-as-overlay: `{colors.primary-overlay}` (rgba(248,212,24,0.85)) is defined in the
  system for branded yellow full-bleed overlay sections — a high-drama effect not yet visible
  on main commerce pages but available in the design system.
- Minimal shape softness: buttons at `{rounded.sm}` (6px), inputs at `{rounded.xs}` (4px).
  Only the sale badge is pill-shaped. The language is crisp and purposeful.


## Colors

### Brand & Accent
- **PDC Yellow** (`{colors.primary}` — #f8d418): The single brand color. Announcement bar
  background, active nav text, all CTA buttons, sale badge, logo-band wordmark accent, and
  all footer/subfooter link hover states. This is a bright, slightly green-shifted yellow —
  closer to a vivid chrome yellow than a warm gold. Its neutrality makes it work equally
  against black and white surfaces.
- **PDC Yellow Faded** (`{colors.primary-faded}` — rgba(248,212,24,0.15)): A near-invisible
  tint used for subtle branded hover backgrounds or highlight washes.
- **PDC Yellow Overlay** (`{colors.primary-overlay}` — rgba(248,212,24,0.85)): A strong
  yellow tint used as a full-bleed overlay on alt-content sections — the brand's most
  dramatic surface treatment.
- **Primary Hover** (`{colors.primary-hover}` — #d4b010): Darkened yellow for button
  `:hover` and `:active` states. Estimated — derive by darkening #f8d418 by ~15%.

### Surface
- **Canvas** (`{colors.canvas}` — #ffffff): The default page floor for all commerce pages.
- **Surface Soft** (`{colors.surface-soft}` — #f6f6f6): Light fill for sidebar backgrounds,
  filter areas, and alternate content sections.
- **Subfooter** (`{colors.subfooter-bg}` — #f6f6f6): The thin band below the main footer
  columns — same tone as surface-soft.
- **Contact Band** (~#1c1c1c): The pre-footer editorial band. Not confirmed as a CSS
  variable in the dumped output — likely set directly on the section element. Very dark
  charcoal, distinct from the pure black footer.
- **Footer** (`{colors.footer-bg}` — #000000): Pure black. The logo-band bg and footer
  share the same black token, reinforcing the brand's black-as-structure approach.

### Hairlines & Borders
- **Hairline** (`{colors.hairline}` — #ebebeb): Default 1px border — content borders,
  footer top rule.
- **Hairline Strong** (`{colors.hairline-strong}` — #e2e2e2): Slightly heavier divider
  used in the subfooter band.

### Text
- **Ink / Heading / Body** (`{colors.ink}` — #000000): All three content text roles
  resolve to pure black. There is no softened near-black — the system uses full black for
  all type on white surfaces.
- **Link** (`{colors.link}` — #000000): Body links are black by default.
- **Link Hover** (`{colors.link-hover}` — #333333): A dark charcoal on link hover — subtle
  darkening rather than a color shift.
- **Muted** (`{colors.muted}` — #999999): Secondary text — footer body copy, meta labels,
  breadcrumbs on lighter surfaces.
- **Muted Link** (`{colors.muted-link}` — #666666): Footer column links in their default
  state. Darker than muted — readable on the black footer.
- **On Primary** (`{colors.on-primary}` — #000000): Black text on yellow CTAs. The brand
  uses black-on-yellow rather than the conventional white-on-color — a confident, bold
  contrast choice.
- **On Dark** (`{colors.on-dark}` — #ffffff): White text on all dark surfaces (logo band,
  hero, contact band, footer).

### Semantic
- **Stock Warning** (`{colors.primary}` — #f8d418): "Only left in stock" text reuses the
  primary yellow. Urgency and brand voltage share one color — an intentional compression
  of the palette.
- **Footer Link Hover** (`{colors.footer-link-hover}` — #f8d418): Footer links illuminate
  in yellow on hover, consistent with the single-accent rule.

### Scrim
- **Scrim** (`{colors.scrim}` — rgba(0,0,0,0.75)): Modal/overlay backdrop at 75% opacity —
  stronger than the Airbnb convention (50%) because the brand's dark photography requires
  more contrast to keep overlaid UI readable.


## Typography

### Font Families

**Display — Nexa Heavy Italic** (`'Nexa Heavy', 'Nexa', sans-serif`):
A condensed geometric sans-serif in its heaviest italic cut. Used only for the two major
editorial headline moments — the homepage hero and the contact-band headline. The geometric
construction and extreme italic angle give it a kinetic, premium-spirits energy that serif
display fonts wouldn't achieve. Nexa is a commercial font (Fontfabric); it loads as a
self-hosted `.woff` file confirmed in the Network tab.

**Body — Miriam Fixed** (`'Miriam Fixed', 'Courier New', Courier, monospace`):
A fixed-width font used here for its precise, typewriter-like texture. Applied to all
running body copy — hero subtitle text, product descriptions, contact section body. At
14px/1.6 line-height it is legible but carries a visible monospace grid that distinguishes
it from the UI layer.

**UI — ITC Eras Book + Gill Sans** (`'ITC Eras', 'Gill Sans', sans-serif`):
Two humanist sans-serifs used for the functional UI layer — navigation, product names,
prices, CTA labels, badges, breadcrumbs. ITC Eras is the primary; Gill Sans is the
fallback. Both confirmed from Network tab font loads. All label contexts render in uppercase.

**Icons — Font Awesome 6** (`fa-regular`, `fa-solid`, `fa-brands`, `fa-light`):
All iconography uses Font Awesome, confirmed from Network tab.

### Hierarchy

| Token | Size | Weight | Style | Case | Use |
|---|---|---|---|---|---|
| `{typography.display-hero}` | ~70px | 900 | italic sans | uppercase | Homepage hero h1 |
| `{typography.display-xl}` | ~44px | 900 | italic sans | uppercase | Contact band headline |
| `{typography.product-detail-title}` | ~28px | 700 | sans | uppercase | Product detail h1 |
| `{typography.price-detail}` | ~24px | 400 | sans | — | Product detail price |
| `{typography.price}` | ~18px | 400 | sans | — | Product card price |
| `{typography.product-title}` | ~14px | 700 | sans | uppercase | Product card name |
| `{typography.nav-link}` | ~14px | 400 | sans | mixed | Navigation links |
| `{typography.body-mono}` | ~14px | 400 | mono | mixed | Hero sub-text, descriptions |
| `{typography.body-mono-sm}` | ~13px | 400 | mono | mixed | Compact body copy |
| `{typography.announcement-text}` | ~13px | 400 | sans | mixed | Announcement bar |
| `{typography.caption}` | ~13px | 400 | sans | mixed | Meta labels, stock warning |
| `{typography.badge}` | ~11px | 700 | sans | uppercase | Sale badge |
| `{typography.button-primary}` | ~14px | 700 | sans | uppercase | All CTA labels |
| `{typography.breadcrumb}` | ~12px | 400 | sans | mixed | Breadcrumb path |
| `{typography.footer-heading}` | ~11px | 700 | sans | uppercase | Footer column heads |

### Font Substitutes for Presentations
- Nexa Heavy Italic → **Barlow Condensed ExtraBold Italic** (Google Fonts) or **Anton**
- Miriam Fixed → **Space Mono** or **iA Writer Mono**
- ITC Eras / Gill Sans → **Nunito** or **Jost**


## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 8px ·
  `{spacing.md}` 12px · `{spacing.base}` 16px · `{spacing.lg}` 24px ·
  `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 64px.

### Grid & Container
- **Max content width:** ~1200px centered.
- **Shop page:** Left sidebar (~220px) + 3-column product grid.
- **Product detail:** 2-column — image (~45%) left, info (~45%) right.
- **Contact band:** Headline (~50% left) + form (~40% right).
- **Footer:** 3 columns (INFO / FOR BUSINESS / CONTACT).

### Macro Triband Stack
1. `{component.announcement-bar}` — yellow, ~36px
2. `{component.logo-header}` — black, ~80px
3. `{component.top-nav}` — white, ~52px
4. **Content zone** — white canvas
5. `{component.contact-band}` — dark charcoal ~#1c1c1c
6. `{component.footer}` — pure black, 3 columns
7. `{component.subfooter}` — #f6f6f6, legal/social strip


## Elevation

No elevation in the commerce layer. Depth comes from color contrast alone.

- **Flat:** All cards, buttons, nav, product images.
- **Scroll-to-top button:** Single observed elevation instance.
- **Scrim:** `{colors.scrim}` rgba(0,0,0,0.75) for modal overlays.


## Pitch Deck Application

**Slide backgrounds:**
- Title slides: `{colors.ink}` #000000 with white Nexa Heavy Italic headline
- Content slides: `{colors.canvas}` #ffffff
- Section dividers: ~#1c1c1c dark charcoal
- Data slides: `{colors.surface-soft}` #f6f6f6

**Headlines:** Nexa Heavy Italic (or Barlow Condensed ExtraBold Italic) — white on dark,
black on white. Never use for body bullets.

**Body copy:** ITC Eras / Gill Sans / Nunito for all running text. Reserve Miriam Fixed /
Space Mono for pull-quotes and data callouts.

**CTA boxes:** `{colors.primary}` #f8d418 fill, black text, 6px radius. One per slide max.

**Charts:** `{colors.primary}` #f8d418 as sole highlight series. Secondary data in
`{colors.muted}` #999 or `{colors.muted-link}` #666. Use `{colors.primary-faded}`
rgba(248,212,24,0.15) for background fills behind data zones.

**Logo:** Always on `{colors.logo-band-bg}` black.

**Yellow overlay effect:** `{colors.primary-overlay}` rgba(248,212,24,0.85) over a product
photograph — confirmed brand treatment, dramatic and on-brand.


## Known Gaps

- Font sizes: all `~` values are visual estimates — confirm via DevTools → Computed → font-size.
- Contact band bg (~#1c1c1c): visual estimate, not found as a named CSS variable.
- Button hover (#d4b010): derived estimate, confirm by inspecting hover state in DevTools.
- Mobile layout: inferred from WordPress/WoodMart conventions, no mobile screenshot taken.
- Navigation dropdowns: surface color and shadow unconfirmed.
- Checkout flow and "For Business" page not captured.
