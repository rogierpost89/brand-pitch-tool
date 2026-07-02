'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PriceRow, TranslationMap, ExtractedBrand, BrandAssets } from '@/lib/types'
import { findPriceRow } from '@/lib/price-match'

interface BrandAssetEntry {
  url: string
  assets: BrandAssets | null
  brandContent: ExtractedBrand | null
}

interface Step2State {
  brandsAssets: BrandAssetEntry[]
  priceRows: PriceRow[]
  language: 'en' | 'nl'
  buyer: { company: string; contact: string }
}

interface EditableRow {
  id: string
  brandName: string
  name: string
  deliveryPriceExcl: string
  deliveryPriceIncl: string
  rsp: string
  marginExcl: string
  marginIncl: string
  annual_volume_btl: string
}

function buildTranslatableFields(brandsAssets: BrandAssetEntry[]): TranslationMap {
  const fields: TranslationMap = {}
  brandsAssets.forEach((ba, bi) => {
    const products = ba.brandContent?.products ?? []
    products.forEach(p => {
      fields[`intro_${bi}_${p.id}`] = p.intro
      fields[`tagline_${bi}_${p.id}`] = p.tagline
      p.usps.forEach((u, i) => { fields[`usp_${i}_${bi}_${p.id}`] = u })
      p.why_it_sells.forEach((w, i) => { fields[`why_${i}_${bi}_${p.id}`] = w })
    })
  })
  return fields
}

function calcMarginPct(rsp: string, cost: string): string {
  const r = parseFloat(rsp.replace(/[^0-9.]/g, ''))
  const c = parseFloat(cost.replace(/[^0-9.]/g, ''))
  if (!r || !c || r <= 0) return ''
  return Math.round((1 - c / r) * 100) + '%'
}

const COL_HEADERS = ['Image', 'Product', 'Brand', 'Price Excl.', 'Price Incl.', 'RSP', 'Margin Excl.', 'Margin Incl.', 'Volume (btl)']
const EDITABLE_FIELDS: (keyof EditableRow)[] = [
  'name', 'brandName', 'deliveryPriceExcl', 'deliveryPriceIncl', 'rsp', 'marginExcl', 'marginIncl', 'annual_volume_btl',
]

export default function Step3() {
  const router = useRouter()
  const [state, setState] = useState<Step2State | null>(null)
  const [editableRows, setEditableRows] = useState<EditableRow[]>([])
  const [translating, setTranslating] = useState(false)
  const [enFields, setEnFields] = useState<TranslationMap>({})
  const [nlFields, setNlFields] = useState<TranslationMap>({})
  const [userEdits, setUserEdits] = useState<TranslationMap>({})
  const [generating, setGenerating] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [previewing, setPreviewing] = useState(false)
  const [marginMode, setMarginMode] = useState<'excl' | 'incl'>('excl')
  const [productImageOverrides, setProductImageOverrides] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('pdc:step2')
    if (!stored) { router.push('/'); return }
    const s = JSON.parse(stored) as Step2State
    setState(s)

    // Build editable rows from matched price data
    const rows: EditableRow[] = []
    s.brandsAssets.forEach(ba => {
      const bc = ba.brandContent
      ;(bc?.products ?? []).forEach(p => {
        const matched = findPriceRow(p, s.priceRows)
        const mExcl = matched?.marginExcl || calcMarginPct(matched?.rsp || '', matched?.deliveryPriceExcl || '')
        const mIncl = matched?.marginIncl || calcMarginPct(matched?.rsp || '', matched?.deliveryPriceIncl || '')
        rows.push({
          id: p.id,
          brandName: bc?.name ?? '',
          name: p.name,
          deliveryPriceExcl: matched?.deliveryPriceExcl ?? '',
          deliveryPriceIncl: matched?.deliveryPriceIncl ?? '',
          rsp: matched?.rsp ?? '',
          marginExcl: mExcl,
          marginIncl: mIncl,
          annual_volume_btl: String(p.annual_volume_btl ?? ''),
        })
      })
    })
    setEditableRows(rows)

    const fields = buildTranslatableFields(s.brandsAssets)
    setEnFields(fields)

    if (s.language === 'nl') {
      setTranslating(true)
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
        .then(r => r.json())
        .then(data => {
          setNlFields(data.translated || {})
          setTranslating(false)
        })
        .catch(() => setTranslating(false))
    }
  }, [router])

  function updateRow(idx: number, field: keyof EditableRow, value: string) {
    setEditableRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function uploadProductImage(productId: string, file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setProductImageOverrides(prev => ({ ...prev, [productId]: result }))
      }
    }
    reader.readAsDataURL(file)
  }

  function clearProductImage(productId: string) {
    setProductImageOverrides(prev => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  function scrapedImageFor(productId: string): string {
    if (!state) return ''
    for (const ba of state.brandsAssets) {
      const p = ba.brandContent?.products.find(pp => pp.id === productId)
      if (p?.image_url) return p.image_url
    }
    return ''
  }

  function autoCalcRow(idx: number) {
    setEditableRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      return {
        ...r,
        marginExcl: r.marginExcl || calcMarginPct(r.rsp, r.deliveryPriceExcl),
        marginIncl: r.marginIncl || calcMarginPct(r.rsp, r.deliveryPriceIncl),
      }
    }))
  }

  const effectiveNl = useCallback((key: string) =>
    userEdits[key] ?? nlFields[key] ?? enFields[key], [userEdits, nlFields, enFields])

  function buildPayload() {
    if (!state) return null

    const overrides = state.language === 'nl'
      ? Object.fromEntries(Object.keys(enFields).map(k => [k, effectiveNl(k)]))
      : {}

    const editedMap: Record<string, EditableRow> = {}
    editableRows.forEach(r => { editedMap[r.id] = r })

    const brands = state.brandsAssets.map(ba => {
      const bc = ba.brandContent
      const products = (bc?.products ?? []).map(p => {
        const ed = editedMap[p.id]
        return {
          ...p,
          imageOverrideDataUri: productImageOverrides[p.id] || undefined,
          annual_volume_btl: ed ? (parseFloat(ed.annual_volume_btl) || 0) : (p.annual_volume_btl ?? 0),
          prices: ed
            ? {
                deliveryPriceExcl: ed.deliveryPriceExcl || '–',
                deliveryPriceIncl: ed.deliveryPriceIncl || '–',
                rsp: ed.rsp || '–',
                marginExcl: ed.marginExcl || calcMarginPct(ed.rsp, ed.deliveryPriceExcl) || '–',
                marginIncl: ed.marginIncl || calcMarginPct(ed.rsp, ed.deliveryPriceIncl) || '–',
              }
            : { deliveryPriceExcl: '–', deliveryPriceIncl: '–', rsp: '–', marginExcl: '–', marginIncl: '–' },
        }
      })
      return {
        name: bc?.name ?? ba.url,
        intro: bc?.intro ?? '',
        assets: ba.assets ?? { logoUrl: '', heroImageUrl: '', productImageUrls: [], description: '' },
        products,
      }
    })

    return {
      deckData: { buyer: state.buyer, language: state.language, marginMode, brands },
      translationOverrides: overrides,
    }
  }

  async function refreshPreview() {
    setError(''); setPreviewing(true)
    try {
      const payload = buildPayload()
      if (!payload) return
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { setError((await res.json()).error); return }
      setPreviewHtml(await res.text())
    } finally { setPreviewing(false) }
  }

  async function publish() {
    setError(''); setGenerating(true)
    try {
      const payload = buildPayload()
      if (!payload) return
      const res = await fetch('/api/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { setError((await res.json()).error); return }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'pitch-deck.pdf'
      a.click()
      URL.revokeObjectURL(a.href)
    } finally { setGenerating(false) }
  }

  if (!state) return <p className="text-xs text-zinc-500 font-mono">Loading…</p>

  const showTranslation = state.language === 'nl'

  return (
    <div>
      <h1 className="text-2xl font-black italic uppercase tracking-tight mb-1">
        Step 3 — Review &amp; Publish
      </h1>
      <p className="text-xs text-zinc-500 font-mono mb-8">
        Edit product data below, refresh the preview, then publish the PDF.
      </p>

      {/* Deck preview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold tracking-[2px] uppercase text-zinc-600">Deck Preview</span>
          <button
            className="text-xs text-zinc-600 hover:text-[#f8d418] font-mono border border-zinc-800 px-3 py-1 disabled:opacity-50"
            onClick={refreshPreview} disabled={previewing}
          >
            {previewing ? 'Rendering…' : '↻ Refresh preview'}
          </button>
        </div>
        {previewHtml ? (
          <iframe
            title="Deck preview"
            srcDoc={previewHtml}
            className="w-full border border-zinc-800 bg-white"
            style={{ aspectRatio: '13.333 / 7.5', height: 'auto' }}
          />
        ) : (
          <div className="border border-dashed border-zinc-800 text-zinc-600 text-xs font-mono p-8 text-center">
            Click &quot;Refresh preview&quot; to render the deck.
          </div>
        )}
      </div>

      {/* Editable product/price grid */}
      {editableRows.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-[2px] uppercase text-zinc-600">Product Overview</span>
            <button
              className="text-xs text-zinc-600 hover:text-[#f8d418] font-mono border border-zinc-800 px-3 py-1"
              onClick={() => editableRows.forEach((_, i) => autoCalcRow(i))}
              title="Auto-calculate empty margin fields from price and RSP"
            >
              ↻ Recalc margins
            </button>
          </div>
          <div className="overflow-x-auto border border-zinc-800">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr>
                  {COL_HEADERS.map(h => (
                    <th key={h} className="text-left text-zinc-600 font-bold tracking-[1.5px] uppercase px-2 py-2 border-b border-zinc-800 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editableRows.map((row, i) => {
                  const overrideUri = productImageOverrides[row.id]
                  const scrapedUrl = scrapedImageFor(row.id)
                  const thumbSrc = overrideUri || scrapedUrl
                  return (
                    <tr key={row.id} className="border-b border-zinc-900 last:border-0">
                      <td className="px-2 py-1 align-middle">
                        <label className="cursor-pointer flex items-center gap-2 group" title="Upload to override">
                          {thumbSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbSrc}
                              alt={row.name}
                              className={`w-10 h-10 object-contain bg-zinc-900 border ${overrideUri ? 'border-[#f8d418]' : 'border-zinc-800'}`}
                            />
                          ) : (
                            <span className="w-10 h-10 border border-dashed border-zinc-700 text-zinc-700 flex items-center justify-center text-[9px]">none</span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) uploadProductImage(row.id, f)
                              e.target.value = ''
                            }}
                          />
                          {overrideUri && (
                            <button
                              type="button"
                              className="text-[9px] text-zinc-500 hover:text-[#f8d418] underline"
                              onClick={e => { e.preventDefault(); clearProductImage(row.id) }}
                              title="Revert to scraped image"
                            >
                              revert
                            </button>
                          )}
                        </label>
                      </td>
                      {EDITABLE_FIELDS.map(field => (
                        <td key={field} className="px-1 py-1">
                          <input
                            className="w-full bg-transparent text-zinc-300 outline-none px-1 py-1 focus:bg-zinc-900 focus:text-white rounded-sm"
                            value={row[field]}
                            onChange={e => updateRow(i, field, e.target.value)}
                            onBlur={() => {
                              if (field === 'rsp' || field === 'deliveryPriceExcl' || field === 'deliveryPriceIncl') {
                                autoCalcRow(i)
                              }
                            }}
                            style={{ minWidth: field === 'name' ? 120 : field === 'brandName' ? 80 : 72 }}
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-700 font-mono mt-1">Click any cell to edit. Margins auto-fill from RSP and price when left empty.</p>
        </div>
      )}

      {translating && (
        <p className="text-xs text-[#f8d418] font-mono mb-6">Translating with Claude…</p>
      )}

      {showTranslation && !translating && (
        <div className="mb-8">
          <div className="grid grid-cols-[140px_1fr_1fr_32px] gap-0 mb-1">
            {['Field', 'English', 'Nederlands — click to edit', ''].map(h => (
              <span key={h} className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 px-2 pb-2">{h}</span>
            ))}
          </div>

          {Object.entries(enFields).map(([key, enVal]) => {
            const nlVal = effectiveNl(key)
            const edited = userEdits[key] !== undefined

            return (
              <div
                key={key}
                className="grid grid-cols-[140px_1fr_1fr_32px] border-t border-zinc-900 items-start"
              >
                <span className="text-xs font-mono text-zinc-600 px-2 py-2 leading-tight">{key}</span>
                <span className="text-xs font-mono text-zinc-500 px-2 py-2 leading-relaxed border-l border-zinc-900">{enVal}</span>
                <textarea
                  className={`text-xs font-mono px-2 py-2 border-l border-zinc-900 bg-transparent resize-none outline-none leading-relaxed ${
                    edited ? 'text-emerald-400' : 'text-zinc-400'
                  }`}
                  rows={Math.max(1, Math.ceil(nlVal.length / 50))}
                  value={nlVal}
                  onChange={e => setUserEdits(prev => ({ ...prev, [key]: e.target.value }))}
                />
                <button
                  className="text-zinc-700 hover:text-[#f8d418] text-sm px-2 py-2 border-l border-zinc-900"
                  title="Reset to auto-translation"
                  onClick={() => setUserEdits(prev => { const n = { ...prev }; delete n[key]; return n })}
                >
                  ↺
                </button>
              </div>
            )
          })}

          <p className="text-xs text-zinc-600 font-mono mt-3">
            {Object.keys(userEdits).length === 0
              ? 'No edits — using auto-translation'
              : `${Object.keys(userEdits).length} field(s) edited`}
          </p>
        </div>
      )}

      {error && <p className="text-red-400 text-xs font-mono mb-4">{error}</p>}

      <div className="flex gap-3 mt-2 items-center">
        <button
          className="border border-zinc-700 text-zinc-500 text-xs font-bold tracking-[2px] uppercase px-4 py-2"
          onClick={() => router.push('/step2')}
        >
          ← Back
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-zinc-500">Margin</span>
          <button
            type="button"
            className={`text-xs font-bold tracking-[2px] uppercase px-3 py-2 border ${
              marginMode === 'excl' ? 'bg-[#f8d418] text-black border-[#f8d418]' : 'border-zinc-700 text-zinc-500'
            }`}
            onClick={() => setMarginMode('excl')}
          >
            Excl.
          </button>
          <button
            type="button"
            className={`text-xs font-bold tracking-[2px] uppercase px-3 py-2 border ${
              marginMode === 'incl' ? 'bg-[#f8d418] text-black border-[#f8d418]' : 'border-zinc-700 text-zinc-500'
            }`}
            onClick={() => setMarginMode('incl')}
          >
            Incl.
          </button>
        </div>
        <button
          className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-8 py-2 disabled:opacity-40"
          onClick={publish}
          disabled={generating || translating}
        >
          {generating ? 'Publishing…' : 'Publish PDF →'}
        </button>
      </div>
    </div>
  )
}
