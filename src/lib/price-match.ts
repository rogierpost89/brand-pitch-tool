import type { PriceRow } from './types'

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Levenshtein edit distance, O(n) space */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const row = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1])
      prev = tmp
    }
  }
  return row[n]
}

/**
 * Returns true when two normalised strings are close enough to be the same product.
 * Allows 1 edit per 6 chars (so "clarea"↔"clareya" → lev=1, threshold=1 ✓
 * but "clarea"↔"clarita" → lev=3, threshold=1 ✗).
 */
function stringsMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  if (a.length >= 4 && b.includes(a)) return true
  if (b.length >= 4 && a.includes(b)) return true
  const maxLen = Math.max(a.length, b.length)
  if (maxLen < 5) return false
  return editDistance(a, b) <= Math.floor(maxLen / 6)
}

/**
 * Returns true when the given Excel productId row looks like it belongs to the
 * product described by (productId slug, productName full text).
 */
export function fuzzyProductMatch(
  productId: string,
  productName: string,
  rowProductId: string
): boolean {
  const rid = normalizeStr(rowProductId)
  if (!rid) return false

  // Match against the Claude-generated slug (e.g. "clarea")
  if (stringsMatch(normalizeStr(productId), rid)) return true

  // Match against any significant word in the full product name
  const tokens = productName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 4)
  return tokens.some(token => stringsMatch(token, rid))
}

/** Find the best-matching price row for a product, or undefined if none match. */
export function findPriceRow(
  product: { id: string; name: string },
  rows: PriceRow[]
): PriceRow | undefined {
  return rows.find(row => fuzzyProductMatch(product.id, product.name, row.productId))
}
