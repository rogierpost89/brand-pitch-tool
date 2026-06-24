const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function imageToDataUri(url: string): Promise<string> {
  if (!url) return ''
  // Already a data URI — return as-is. Used by per-product image overrides from Step 3.
  if (url.startsWith('data:')) return url
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch image ${url}: ${res.status}`)
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = await res.arrayBuffer()
  const b64 = Buffer.from(new Uint8Array(buffer)).toString('base64')

  return `data:${contentType};base64,${b64}`
}
