import { describe, it, expect } from 'vitest'
import { pickLogo, pickHero, pickProducts, extractReferenceColors, mergeImages } from './classify'
import type { RawImage, RawPageData } from './types'

function img(partial: Partial<RawImage>): RawImage {
  return {
    src: partial.src ?? 'https://example.com/x.jpg',
    alt: partial.alt ?? '',
    filename: partial.filename ?? (partial.src?.split('/').pop()?.toLowerCase() ?? ''),
    width: partial.width ?? 400,
    height: partial.height ?? 400,
    areaPx: partial.areaPx ?? (partial.width ?? 400) * (partial.height ?? 400),
    inHeader: partial.inHeader ?? false,
    isAboveFold: partial.isAboveFold ?? false,
    srcsetLargest: partial.srcsetLargest,
  }
}

function page(overrides: Partial<RawPageData> = {}): RawPageData {
  return {
    url: 'https://example.com',
    title: 'Example',
    description: '',
    visibleText: '',
    images: [],
    svgs: [],
    cssCustomProps: {},
    h1FontFamily: 'sans-serif',
    bodyFontFamily: 'sans-serif',
    ...overrides,
  }
}

describe('pickLogo', () => {
  it('prefers an image whose alt mentions "logo"', () => {
    const p = page({
      images: [
        img({ src: 'https://x/hero.jpg', alt: 'Hero', width: 1000, height: 600 }),
        img({ src: 'https://x/brand.svg', alt: 'Brand logo', width: 100, height: 100 }),
      ],
    })
    expect(pickLogo(p)).toBe('https://x/brand.svg')
  })

  it('falls back to apple-touch-icon, then favicon', () => {
    expect(pickLogo(page({ appleTouchIcon: 'https://x/touch.png' }))).toBe('https://x/touch.png')
    expect(pickLogo(page({ favicon: 'https://x/fav.ico' }))).toBe('https://x/fav.ico')
  })

  it('returns empty string when nothing matches', () => {
    expect(pickLogo(page())).toBe('')
  })

  it('prefers an in-header image over a body image whose filename happens to include "logo"', () => {
    // Real-world case: a tequila product photo with "logo" in its filename,
    // and the actual site logo sitting in the header without that hint.
    const p = page({
      images: [
        img({ src: 'https://x/Tequila-ArteNOM-logo-2020.jpg', filename: 'tequila-artenom-logo-2020.jpg', width: 1024, height: 1024, inHeader: false }),
        img({ src: 'https://x/site-mark.png', filename: 'site-mark.png', alt: '', width: 200, height: 60, inHeader: true }),
      ],
    })
    expect(pickLogo(p)).toBe('https://x/site-mark.png')
  })

  it('still falls back to filename hint when nothing is in the header', () => {
    const p = page({
      images: [
        img({ src: 'https://x/brand-logo.svg', filename: 'brand-logo.svg', width: 200, height: 60, inHeader: false }),
        img({ src: 'https://x/photo.jpg', filename: 'photo.jpg', width: 1000, height: 700, inHeader: false }),
      ],
    })
    expect(pickLogo(p)).toBe('https://x/brand-logo.svg')
  })
})

describe('pickHero', () => {
  it('uses og:image when present', () => {
    expect(pickHero(page({ ogImage: 'https://x/og.jpg' }), '')).toBe('https://x/og.jpg')
  })

  it('falls back to largest above-the-fold image when no og:image', () => {
    const p = page({
      images: [
        img({ src: 'https://x/below.jpg', width: 2000, height: 1200, isAboveFold: false }),
        img({ src: 'https://x/hero.jpg', width: 1200, height: 800, isAboveFold: true }),
        img({ src: 'https://x/small.jpg', width: 200, height: 100, isAboveFold: true }),
      ],
    })
    expect(pickHero(p, '')).toBe('https://x/hero.jpg')
  })

  it('excludes the picked logo even if it would be the biggest', () => {
    const p = page({
      images: [
        img({ src: 'https://x/logo.png', alt: 'Brand logo', width: 2000, height: 2000, isAboveFold: true }),
        img({ src: 'https://x/hero.jpg', width: 1200, height: 800, isAboveFold: true }),
      ],
    })
    expect(pickHero(p, 'https://x/logo.png')).toBe('https://x/hero.jpg')
  })
})

describe('pickProducts', () => {
  it('returns largest near-square candidates, excluding logo + hero', () => {
    const p = page({
      images: [
        img({ src: 'https://x/logo.svg', filename: 'logo.svg', width: 200, height: 60 }),
        img({ src: 'https://x/hero.jpg', filename: 'hero.jpg', width: 1600, height: 1000 }),
        img({ src: 'https://x/p1.jpg', filename: 'product-1.jpg', width: 800, height: 800 }),
        img({ src: 'https://x/p2.jpg', filename: 'p2.jpg', width: 600, height: 600 }),
        img({ src: 'https://x/p3.jpg', filename: 'p3.jpg', width: 400, height: 400 }),
        img({ src: 'https://x/banner.jpg', filename: 'banner.jpg', width: 2000, height: 400 }),
      ],
    })
    const out = pickProducts(p, new Set(['https://x/logo.svg', 'https://x/hero.jpg']))
    expect(out).toContain('https://x/p1.jpg')
    expect(out).toContain('https://x/p2.jpg')
    expect(out).toContain('https://x/p3.jpg')
    expect(out).not.toContain('https://x/logo.svg')
    expect(out).not.toContain('https://x/hero.jpg')
    // The square product with "product" in its name should come first
    expect(out[0]).toBe('https://x/p1.jpg')
  })

  it('honors the limit', () => {
    const images: RawImage[] = []
    for (let i = 0; i < 20; i++) {
      images.push(img({ src: `https://x/p${i}.jpg`, filename: `p${i}.jpg`, width: 500, height: 500 }))
    }
    const out = pickProducts(page({ images }), new Set(), 5)
    expect(out).toHaveLength(5)
  })

  it('filters out tiny thumbnails and icons', () => {
    const p = page({
      images: [
        img({ src: 'https://x/tiny.jpg', filename: 'tiny.jpg', width: 30, height: 30 }),
        img({ src: 'https://x/icon.svg', filename: 'icon.svg', width: 500, height: 500 }),
        img({ src: 'https://x/big.jpg', filename: 'big.jpg', width: 800, height: 800 }),
      ],
    })
    const out = pickProducts(p, new Set())
    expect(out).toEqual(['https://x/big.jpg'])
  })
})

describe('extractReferenceColors', () => {
  it('keeps hex and rgb/rgba values, drops non-colors, dedupes', () => {
    const out = extractReferenceColors({
      '--primary': '#f8d418',
      '--bg': '#ffffff',
      '--font-size': '14px',
      '--accent': 'rgb(248, 212, 24)',
      '--copy': '#f8d418', // duplicate
    })
    expect(out).toContain('#f8d418')
    expect(out).toContain('#ffffff')
    expect(out).toContain('rgb(248, 212, 24)')
    expect(out).not.toContain('14px')
    expect(out.filter(c => c === '#f8d418')).toHaveLength(1)
  })
})

describe('mergeImages', () => {
  it('deduplicates by URL, preserving first occurrence', () => {
    const a = [img({ src: 'https://x/a.jpg', width: 800, height: 800 })]
    const b = [
      img({ src: 'https://x/a.jpg', width: 100, height: 100 }), // dupe with smaller size
      img({ src: 'https://x/b.jpg', width: 400, height: 400 }),
    ]
    const merged = mergeImages([a, b])
    expect(merged).toHaveLength(2)
    const first = merged.find(i => i.src === 'https://x/a.jpg')!
    expect(first.width).toBe(800) // first-seen wins
  })
})
