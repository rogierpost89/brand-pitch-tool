/**
 * CLI: pnpm scrape <url>
 *
 * Scrapes a brand site with Playwright and writes the deterministic result to
 * data/brand-cache/<slug>.json. The Next.js app reads from that cache during
 * Step 1 instead of doing live scraping — keeps the runtime fast, deterministic,
 * and free of headless-browser pain inside serverless functions.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { scrapeBrand, urlSlug } from '../src/lib/brand-scraper'

async function main() {
  const url = process.argv[2]
  if (!url || !/^https?:\/\//i.test(url)) {
    console.error('Usage: pnpm scrape <https://brand.example.com>')
    process.exit(1)
  }

  console.log(`Scraping ${url} ...`)
  const t0 = Date.now()
  const result = await scrapeBrand(url)
  const ms = Date.now() - t0

  const dir = resolve(process.cwd(), 'data/brand-cache')
  mkdirSync(dir, { recursive: true })
  const slug = urlSlug(url)
  const file = resolve(dir, `${slug}.json`)
  writeFileSync(file, JSON.stringify(result, null, 2))

  console.log(`Done in ${ms}ms.`)
  console.log(`  logo:        ${result.classification.logoUrl || '(none)'}`)
  console.log(`  hero:        ${result.classification.heroImageUrl || '(none)'}`)
  console.log(`  products:    ${result.classification.productImageUrls.length} candidates`)
  console.log(`  ref colors:  ${result.reference.colors.slice(0, 4).join(', ') || '(none)'}`)
  console.log(`  -> ${file}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
