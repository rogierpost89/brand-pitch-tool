export interface ScrapedPage {
  title: string
  content: string
  images: Record<string, string> // URL → description (includes OG/meta images)
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** Extract hero-candidate images from raw HTML: og:image, twitter:image, CSS background-image */
async function fetchMetaImages(url: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return {}
    const html = await res.text()
    const origin = new URL(url).origin
    const meta: Record<string, string> = {}

    const resolve = (src: string) =>
      src.startsWith('http') ? src : `${origin}${src.startsWith('/') ? '' : '/'}${src}`

    // og:image — almost always the hero/lifestyle photo
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    if (og?.[1]) meta[resolve(og[1])] = 'og:image — primary hero/lifestyle photo'

    // twitter:image
    const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
    if (tw?.[1] && !meta[resolve(tw[1])]) meta[resolve(tw[1])] = 'twitter:image — hero photo'

    // CSS background-image (hero sections, banners)
    const bgRegex = /background(?:-image)?:\s*url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi
    let m: RegExpExecArray | null
    while ((m = bgRegex.exec(html)) !== null) {
      const src = resolve(m[1])
      if (!meta[src] && !src.includes('data:') && (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))) {
        meta[src] = 'CSS background-image — hero/banner candidate'
      }
    }

    return meta
  } catch {
    return {}
  }
}

export async function scrapeBrandPage(url: string): Promise<ScrapedPage> {
  // Run Jina and HTML meta-image extraction in parallel
  const [jinaRes, metaImages] = await Promise.all([
    fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
      headers: { 'Accept': 'application/json', 'X-With-Images-Summary': 'true' },
    }),
    fetchMetaImages(url),
  ])

  if (!jinaRes.ok) throw new Error(`Jina Reader failed: ${jinaRes.status}`)

  const json = await jinaRes.json() as {
    data: { title: string; content: string; images?: Record<string, string> }
  }

  // Merge: meta images first (Claude should see og:image prominently), then Jina img tags
  const images = { ...metaImages, ...(json.data.images || {}) }

  return {
    title: json.data.title || '',
    content: json.data.content || '',
    images,
  }
}
