import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { BrandScrapeResult } from './types'
import { urlSlug } from './index'

const CACHE_DIR = resolve(process.cwd(), 'data/brand-cache')

export function cachePath(url: string): string {
  return resolve(CACHE_DIR, `${urlSlug(url)}.json`)
}

export function readCache(url: string): BrandScrapeResult | null {
  const file = cachePath(url)
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8')) as BrandScrapeResult
}
