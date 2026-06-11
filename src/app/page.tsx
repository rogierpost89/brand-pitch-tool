'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BrandAssets } from '@/lib/types'

interface BrandEntry {
  url: string
  assets: BrandAssets | null
  loading: boolean
  error: string | null
  showFallback: boolean
  fallbackFile: File | null
}

export default function Step1() {
  const router = useRouter()
  const [brands, setBrands] = useState<BrandEntry[]>([
    { url: '', assets: null, loading: false, error: null, showFallback: false, fallbackFile: null },
  ])

  function updateBrand(idx: number, patch: Partial<BrandEntry>) {
    setBrands(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b))
  }

  async function analyseUrl(idx: number) {
    const entry = brands[idx]
    if (!entry.url) return
    updateBrand(idx, { loading: true, error: null, assets: null })

    const res = await fetch('/api/analyse-brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: entry.url }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.fallback) {
        updateBrand(idx, { loading: false, showFallback: true })
      } else {
        updateBrand(idx, { loading: false, error: data.error })
      }
      return
    }

    updateBrand(idx, { loading: false, assets: data.assets })
  }

  async function analyseFallback(idx: number) {
    const entry = brands[idx]
    if (!entry.fallbackFile) return
    updateBrand(idx, { loading: true, error: null })

    const formData = new FormData()
    formData.append('screenshot', entry.fallbackFile)
    formData.append('url', entry.url)

    const res = await fetch('/api/analyse-brand', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      updateBrand(idx, { loading: false, error: data.error })
      return
    }

    updateBrand(idx, { loading: false, assets: data.assets })
  }

  function proceed() {
    const ready = brands.filter(b => b.assets !== null)
    if (ready.length === 0) return
    sessionStorage.setItem('pdc:brands-assets', JSON.stringify(ready.map(b => ({
      url: b.url,
      assets: b.assets,
    }))))
    router.push('/step2')
  }

  const allDone = brands.every(b => b.assets !== null)

  return (
    <div>
      <h1 className="text-2xl font-black italic uppercase tracking-tight mb-1">
        Step 1 — Brand Analysis
      </h1>
      <p className="text-xs text-zinc-500 font-mono mb-8">
        Paste each brand URL. Claude Vision extracts the logo, hero image, and product photos.
      </p>

      <div className="flex flex-col gap-6">
        {brands.map((entry, idx) => (
          <div key={idx} className="border border-zinc-800 p-5">
            <div className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 mb-3">
              Brand {idx + 1}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
                placeholder="https://brand-website.com"
                value={entry.url}
                onChange={e => updateBrand(idx, { url: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && analyseUrl(idx)}
              />
              <button
                className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-4 py-2 disabled:opacity-40"
                onClick={() => analyseUrl(idx)}
                disabled={entry.loading || !entry.url}
              >
                {entry.loading ? 'Scanning…' : 'Analyse'}
              </button>
            </div>

            {entry.error && (
              <p className="text-red-400 text-xs font-mono mb-2">{entry.error}</p>
            )}

            {entry.showFallback && (
              <div className="border border-zinc-700 p-3 bg-zinc-900">
                <p className="text-xs text-zinc-400 font-mono mb-2">
                  URL could not be scraped. Upload a screenshot instead:
                </p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs text-zinc-400 font-mono"
                    onChange={e => updateBrand(idx, { fallbackFile: e.target.files?.[0] || null })}
                  />
                  <button
                    className="bg-zinc-700 text-white text-xs font-bold tracking-[2px] uppercase px-3 py-1 disabled:opacity-40"
                    onClick={() => analyseFallback(idx)}
                    disabled={!entry.fallbackFile || entry.loading}
                  >
                    Analyse
                  </button>
                </div>
              </div>
            )}

            {entry.assets && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <p className="text-xs font-bold text-[#f8d418] tracking-[2px] uppercase mb-2">
                  Extracted
                </p>
                <div className="flex gap-3 flex-wrap">
                  {entry.assets.logoUrl && (
                    <img src={entry.assets.logoUrl} alt="Logo" className="h-8 object-contain bg-zinc-800 p-1" />
                  )}
                  {entry.assets.heroImageUrl && (
                    <img src={entry.assets.heroImageUrl} alt="Hero" className="h-16 w-24 object-cover" />
                  )}
                  {entry.assets.productImageUrls.slice(0, 3).map((u, i) => (
                    <img key={i} src={u} alt={`Product ${i + 1}`} className="h-16 w-16 object-contain bg-zinc-800" />
                  ))}
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-2 leading-relaxed">
                  {entry.assets.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          className="border border-zinc-700 text-zinc-500 text-xs font-bold tracking-[2px] uppercase px-4 py-2 hover:border-zinc-500"
          onClick={() => setBrands(prev => [...prev, {
            url: '', assets: null, loading: false, error: null, showFallback: false, fallbackFile: null,
          }])}
        >
          + Add brand
        </button>
        <button
          className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-6 py-2 disabled:opacity-40 ml-auto"
          onClick={proceed}
          disabled={!allDone}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
