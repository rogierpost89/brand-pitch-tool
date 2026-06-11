'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { BrandAssets, ExtractedBrand, ExtractedProduct } from '@/lib/types'

interface BrandEntry {
  url: string
  assets: BrandAssets | null
  brandContent: ExtractedBrand | null
  loading: boolean
  error: string | null
  uploadFile: File | null        // renamed from fallbackFile; now always-visible
  contentOpen: boolean
}

function emptyProduct(idx: number): ExtractedProduct {
  return {
    id: `product-${idx + 1}`,
    name: '',
    intro: '',
    tagline: '',
    usps: ['', '', ''],
    why_it_sells: ['', '', ''],
    annual_volume_btl: 0,
    image_url: '',
  }
}

function emptyBrandContent(): ExtractedBrand {
  return { name: '', intro: '', products: [emptyProduct(0)] }
}

export default function Step1() {
  const router = useRouter()
  const [brands, setBrands] = useState<BrandEntry[]>([
    { url: '', assets: null, brandContent: null, loading: false, error: null, uploadFile: null, contentOpen: true },
  ])

  // Restore state when navigating back from Step 2
  useEffect(() => {
    const stored = sessionStorage.getItem('pdc:brands-assets')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as Array<{ url: string; assets: BrandAssets; brandContent: ExtractedBrand | null }>
      if (parsed.length > 0) {
        setBrands(parsed.map(b => ({
          url: b.url,
          assets: b.assets,
          brandContent: b.brandContent,
          loading: false,
          error: null,
          uploadFile: null,
          contentOpen: false,
        })))
      }
    } catch { /* ignore */ }
  }, [])

  function updateBrand(idx: number, patch: Partial<BrandEntry>) {
    setBrands(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b))
  }

  function updateBrandContent(idx: number, patch: Partial<ExtractedBrand>) {
    setBrands(prev => prev.map((b, i) => {
      if (i !== idx) return b
      return { ...b, brandContent: { ...(b.brandContent ?? emptyBrandContent()), ...patch } }
    }))
  }

  function updateProduct(brandIdx: number, productIdx: number, patch: Partial<ExtractedProduct>) {
    setBrands(prev => prev.map((b, i) => {
      if (i !== brandIdx) return b
      const bc = b.brandContent ?? emptyBrandContent()
      const products = bc.products.map((p, pi) => pi === productIdx ? { ...p, ...patch } : p)
      return { ...b, brandContent: { ...bc, products } }
    }))
  }

  function updateUsp(brandIdx: number, productIdx: number, uspIdx: number, value: string) {
    setBrands(prev => prev.map((b, i) => {
      if (i !== brandIdx) return b
      const bc = b.brandContent ?? emptyBrandContent()
      const products = bc.products.map((p, pi) => {
        if (pi !== productIdx) return p
        const usps = p.usps.map((u, ui) => ui === uspIdx ? value : u)
        return { ...p, usps }
      })
      return { ...b, brandContent: { ...bc, products } }
    }))
  }

  function updateWhySells(brandIdx: number, productIdx: number, wIdx: number, value: string) {
    setBrands(prev => prev.map((b, i) => {
      if (i !== brandIdx) return b
      const bc = b.brandContent ?? emptyBrandContent()
      const products = bc.products.map((p, pi) => {
        if (pi !== productIdx) return p
        const why_it_sells = p.why_it_sells.map((w, wi) => wi === wIdx ? value : w)
        return { ...p, why_it_sells }
      })
      return { ...b, brandContent: { ...bc, products } }
    }))
  }

  async function uploadProductImage(brandIdx: number, productIdx: number, file: File) {
    // Compress and store as data URI so it gets embedded in the deck
    return new Promise<void>(resolve => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, 800 / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          URL.revokeObjectURL(objectUrl)
          if (!blob) return resolve()
          const reader = new FileReader()
          reader.onload = e => {
            updateProduct(brandIdx, productIdx, { image_url: e.target?.result as string })
            resolve()
          }
          reader.readAsDataURL(blob)
        }, 'image/jpeg', 0.85)
      }
      img.src = objectUrl
    })
  }

  function addProduct(brandIdx: number) {
    setBrands(prev => prev.map((b, i) => {
      if (i !== brandIdx) return b
      const bc = b.brandContent ?? emptyBrandContent()
      return { ...b, brandContent: { ...bc, products: [...bc.products, emptyProduct(bc.products.length)] } }
    }))
  }

  async function analyseUrl(idx: number) {
    const entry = brands[idx]
    if (!entry.url) return
    updateBrand(idx, { loading: true, error: null, assets: null, brandContent: null })

    const res = await fetch('/api/analyse-brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: entry.url }),
    })

    const data = await res.json()

    if (!res.ok) {
      updateBrand(idx, { loading: false, error: data.error })
      return
    }

    updateBrand(idx, {
      loading: false,
      assets: data.assets,
      brandContent: data.brandContent ?? emptyBrandContent(),
      contentOpen: true,
    })
  }

  async function analyseFile(idx: number) {
    const entry = brands[idx]
    if (!entry.uploadFile) return

    const file = entry.uploadFile
    const mime = file.type

    if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        file.name.toLowerCase().endsWith('.pptx')) {
      updateBrand(idx, { error: 'PPTX not supported — export as PDF from PowerPoint first.' })
      return
    }

    const MAX_FILE_MB = 20
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      updateBrand(idx, { error: `File too large (max ${MAX_FILE_MB} MB). Compress or crop the file and try again.` })
      return
    }

    updateBrand(idx, { loading: true, error: null, assets: null, brandContent: null })

    const formData = new FormData()
    formData.append('url', entry.url || 'https://unknown.com')

    if (mime.startsWith('image/')) {
      const compressed = await compressImage(file)
      formData.append('file', compressed, 'upload.jpg')
    } else {
      formData.append('file', file, file.name)
    }

    const res = await fetch('/api/analyse-brand', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      updateBrand(idx, { loading: false, error: data.error })
      return
    }

    updateBrand(idx, {
      loading: false,
      assets: data.assets,
      brandContent: data.brandContent ?? emptyBrandContent(),
      contentOpen: true,
    })
  }

  async function compressImage(file: File): Promise<Blob> {
    return new Promise(resolve => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, 1280 / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => { URL.revokeObjectURL(objectUrl); resolve(blob!) }, 'image/jpeg', 0.80)
      }
      img.src = objectUrl
    })
  }

  function proceed() {
    const ready = brands.filter(b => b.assets !== null)
    if (ready.length === 0) return
    sessionStorage.setItem('pdc:brands-assets', JSON.stringify(ready.map(b => ({
      url: b.url,
      assets: b.assets,
      brandContent: b.brandContent,
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
        Paste each brand URL. Claude Vision extracts the logo, hero image, product photos, and brand copy.
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

            {/* Always-visible file drop zone */}
            <div className="mt-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-zinc-600 text-xs font-mono">or upload a file</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {!entry.uploadFile ? (
                <label
                  className="block border border-dashed border-zinc-700 p-4 text-center cursor-pointer hover:border-zinc-500 transition-colors"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault()
                    const f = e.dataTransfer.files[0]
                    if (f) updateBrand(idx, { uploadFile: f, error: null })
                  }}
                >
                  <div className="text-zinc-500 text-xs font-mono mb-1">
                    Drop screenshot, PDF, or brand presentation
                  </div>
                  <div className="text-zinc-600 text-xs font-mono">
                    PNG · JPG · PDF — or{' '}
                    <span className="text-[#f8d418] underline">browse</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) updateBrand(idx, { uploadFile: f, error: null })
                    }}
                  />
                </label>
              ) : (
                <div className="border border-dashed border-[#f8d418] px-4 py-3 flex items-center gap-3">
                  <span className="text-sm">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-mono truncate">{entry.uploadFile.name}</div>
                    <div className="text-zinc-500 text-xs font-mono">
                      {(entry.uploadFile.size / 1024 / 1024).toFixed(1)} MB · {entry.uploadFile.type || 'file'}
                    </div>
                  </div>
                  <button
                    className="text-zinc-600 hover:text-red-400 text-xs font-mono px-1"
                    onClick={() => updateBrand(idx, { uploadFile: null })}
                  >
                    ✕
                  </button>
                  <button
                    className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-3 py-1.5 disabled:opacity-40"
                    onClick={() => analyseFile(idx)}
                    disabled={entry.loading}
                  >
                    {entry.loading ? 'Analysing…' : 'Analyse'}
                  </button>
                </div>
              )}

              <p className="text-zinc-700 text-xs font-mono mt-1">
                PPTX? Export as PDF from PowerPoint first.
              </p>
            </div>

            {entry.assets && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <p className="text-xs font-bold text-[#f8d418] tracking-[2px] uppercase mb-2">
                  Extracted Visuals
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

            {entry.brandContent !== null && (
              <div className="mt-4 border-t border-zinc-800 pt-4">
                <button
                  className="flex items-center gap-2 text-xs font-bold text-[#f8d418] tracking-[2px] uppercase mb-4 hover:opacity-80"
                  onClick={() => updateBrand(idx, { contentOpen: !entry.contentOpen })}
                >
                  <span>{entry.contentOpen ? '▼' : '▶'}</span>
                  Brand Content — Review &amp; Edit
                </button>

                {entry.contentOpen && (
                  <div className="flex flex-col gap-5">
                    {/* Brand-level fields */}
                    <div className="border border-zinc-800 p-4 bg-zinc-950">
                      <p className="text-xs font-bold tracking-[2px] uppercase text-zinc-500 mb-3">Brand</p>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-xs text-[#f8d418] font-mono block mb-1">Brand name</label>
                          <input
                            className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
                            value={entry.brandContent.name}
                            onChange={e => updateBrandContent(idx, { name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#f8d418] font-mono block mb-1">Brand intro</label>
                          <textarea
                            className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418] resize-none"
                            rows={3}
                            value={entry.brandContent.intro}
                            onChange={e => updateBrandContent(idx, { intro: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Per-product fields */}
                    {entry.brandContent.products.map((product, pi) => (
                      <div key={pi} className="border border-zinc-800 p-4 bg-zinc-950">
                        <p className="text-xs font-bold tracking-[2px] uppercase text-zinc-500 mb-3">
                          Product {pi + 1}
                        </p>
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-xs text-[#f8d418] font-mono block mb-1">Product name</label>
                              <input
                                className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
                                value={product.name}
                                onChange={e => updateProduct(idx, pi, { name: e.target.value })}
                              />
                            </div>
                            <div className="w-40">
                              <label className="text-xs text-[#f8d418] font-mono block mb-1">ID (slug)</label>
                              <input
                                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
                                value={product.id}
                                onChange={e => updateProduct(idx, pi, { id: e.target.value })}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-[#f8d418] font-mono block mb-1">Tagline</label>
                            <input
                              className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
                              value={product.tagline}
                              onChange={e => updateProduct(idx, pi, { tagline: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#f8d418] font-mono block mb-1">Intro</label>
                            <textarea
                              className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418] resize-none"
                              rows={3}
                              value={product.intro}
                              onChange={e => updateProduct(idx, pi, { intro: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#f8d418] font-mono block mb-2">USPs</label>
                            <div className="flex flex-col gap-2">
                              {(product.usps.length >= 3 ? product.usps.slice(0, 3) : [...product.usps, ...Array(3 - product.usps.length).fill('')]).map((usp, ui) => (
                                <textarea
                                  key={ui}
                                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono px-3 py-2 outline-none focus:border-[#f8d418] resize-none"
                                  rows={2}
                                  placeholder={`USP ${ui + 1}`}
                                  value={usp}
                                  onChange={e => updateUsp(idx, pi, ui, e.target.value)}
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-[#f8d418] font-mono block mb-2">Why it sells</label>
                            <div className="flex flex-col gap-2">
                              {(product.why_it_sells.length >= 3 ? product.why_it_sells.slice(0, 3) : [...product.why_it_sells, ...Array(3 - product.why_it_sells.length).fill('')]).map((w, wi) => (
                                <textarea
                                  key={wi}
                                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono px-3 py-2 outline-none focus:border-[#f8d418] resize-none"
                                  rows={2}
                                  placeholder={`Reason ${wi + 1}`}
                                  value={w}
                                  onChange={e => updateWhySells(idx, pi, wi, e.target.value)}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-4 items-end">
                            <div className="w-40">
                              <label className="text-xs text-[#f8d418] font-mono block mb-1">Annual vol. (btl)</label>
                              <input
                                type="number"
                                className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
                                value={product.annual_volume_btl}
                                onChange={e => updateProduct(idx, pi, { annual_volume_btl: Number(e.target.value) })}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-[#f8d418] font-mono block mb-1">Product photo</label>
                              <div className="flex gap-2 items-center">
                                {product.image_url ? (
                                  <>
                                    <img src={product.image_url} alt="Product" className="h-10 w-10 object-contain bg-zinc-800" />
                                    <label className="cursor-pointer text-xs text-zinc-500 font-mono hover:text-white">
                                      Replace
                                      <input type="file" accept="image/*" className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadProductImage(idx, pi, f) }} />
                                    </label>
                                    <button className="text-zinc-600 hover:text-red-400 text-xs font-mono"
                                      onClick={() => updateProduct(idx, pi, { image_url: '' })}>✕</button>
                                  </>
                                ) : (
                                  <label className="cursor-pointer border border-zinc-600 text-zinc-400 text-xs font-mono px-3 py-2 hover:border-[#f8d418] hover:text-white transition-colors">
                                    Upload photo
                                    <input type="file" accept="image/*" className="hidden"
                                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadProductImage(idx, pi, f) }} />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      className="border border-zinc-700 text-zinc-500 text-xs font-mono px-4 py-2 hover:border-zinc-500 self-start"
                      onClick={() => addProduct(idx)}
                    >
                      + Add product
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          className="border border-zinc-700 text-zinc-500 text-xs font-bold tracking-[2px] uppercase px-4 py-2 hover:border-zinc-500"
          onClick={() => setBrands(prev => [...prev, {
            url: '', assets: null, brandContent: null, loading: false, error: null, uploadFile: null, contentOpen: true,
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
