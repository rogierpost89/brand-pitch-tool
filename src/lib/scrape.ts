export interface ScrapedPage {
  title: string
  content: string
  images: Record<string, string> // URL → alt text / description
}

export async function scrapeBrandPage(url: string): Promise<ScrapedPage> {
  const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
    headers: {
      'Accept': 'application/json',
      'X-With-Images-Summary': 'true',
    },
  })

  if (!res.ok) throw new Error(`Jina Reader failed: ${res.status}`)

  const json = await res.json() as {
    data: { title: string; content: string; images?: Record<string, string> }
  }

  return {
    title: json.data.title || '',
    content: json.data.content || '',
    images: json.data.images || {},
  }
}
