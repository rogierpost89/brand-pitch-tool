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

export default function Step3() {
  const router = useRouter()
  const [state, setState] = useState<Step2State | null>(null)
  const [translating, setTranslating] = useState(false)
  const [enFields, setEnFields] = useState<TranslationMap>({})
  const [nlFields, setNlFields] = useState<TranslationMap>({})
  const [userEdits, setUserEdits] = useState<TranslationMap>({})
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('pdc:step2')
    if (!stored) { router.push('/'); return }
    const s = JSON.parse(stored) as Step2State
    setState(s)

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

  const effectiveNl = useCallback((key: string) =>
    userEdits[key] ?? nlFields[key] ?? enFields[key], [userEdits, nlFields, enFields])

  function calcMarginPct(rsp: string, cost: string): string {
    const r = parseFloat(rsp.replace(/[^0-9.]/g, ''))
    const c = parseFloat(cost.replace(/[^0-9.]/g, ''))
    if (!r || !c || r <= 0) return ''
    return Math.round((1 - c / r) * 100) + '%'
  }

  async function generate() {
    if (!state) return
    setGenerating(true)
    setError(null)

    const overrides = state.language === 'nl'
      ? Object.fromEntries(
          Object.keys(enFields).map(k => [k, effectiveNl(k)])
        )
      : {}

    const brands = state.brandsAssets.map(ba => {
      const bc = ba.brandContent
      const products = (bc?.products ?? []).map(p => {
        const row = findPriceRow(p, state.priceRows)
        return {
          ...p,
          prices: row
            ? {
                deliveryPriceExcl: row.deliveryPriceExcl,
                deliveryPriceIncl: row.deliveryPriceIncl,
                rsp: row.rsp,
                marginExcl: row.marginExcl || calcMarginPct(row.rsp, row.deliveryPriceExcl),
                marginIncl: row.marginIncl || calcMarginPct(row.rsp, row.deliveryPriceIncl),
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

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deckData: {
          buyer: state.buyer,
          language: state.language,
          brands,
        },
        translationOverrides: overrides,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      setGenerating(false)
      return
    }

    const html = await res.text()
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pitch-deck.html'
    a.click()
    setGenerating(false)
  }

  if (!state) return <p className="text-xs text-zinc-500 font-mono">Loading…</p>

  const showTranslation = state.language === 'nl'

  return (
    <div>
      <h1 className="text-2xl font-black italic uppercase tracking-tight mb-1">
        Step 3 — {showTranslation ? 'Review Translation' : 'Generate'}
      </h1>
      <p className="text-xs text-zinc-500 font-mono mb-8">
        {showTranslation
          ? 'Claude auto-translated the copy. Edit any field below, then generate.'
          : 'All set. Click Generate to download your pitch deck.'}
      </p>

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

      <div className="flex gap-3 mt-2">
        <button
          className="border border-zinc-700 text-zinc-500 text-xs font-bold tracking-[2px] uppercase px-4 py-2"
          onClick={() => router.push('/step2')}
        >
          ← Back
        </button>
        <button
          className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-8 py-2 disabled:opacity-40 ml-auto"
          onClick={generate}
          disabled={generating || translating}
        >
          {generating ? 'Generating…' : 'Generate & Download →'}
        </button>
      </div>
    </div>
  )
}
