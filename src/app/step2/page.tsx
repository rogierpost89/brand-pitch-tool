'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PriceRow, ExtractedBrand, BrandAssets } from '@/lib/types'
import { fuzzyProductMatch } from '@/lib/price-match'

interface BrandAssetEntry {
  url: string
  assets: BrandAssets | null
  brandContent: ExtractedBrand | null
}

export default function Step2() {
  const router = useRouter()
  const [brandsAssets, setBrandsAssets] = useState<BrandAssetEntry[]>([])
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priceRows, setPriceRows] = useState<PriceRow[]>([])
  const [language, setLanguage] = useState<'en' | 'nl'>('en')

  useEffect(() => {
    const stored = sessionStorage.getItem('pdc:brands-assets')
    if (!stored) { router.push('/'); return }
    setBrandsAssets(JSON.parse(stored) as BrandAssetEntry[])
  }, [router])

  async function uploadExcelFile() {
    if (!excelFile) return
    setUploadingFile(true)
    setError(null)

    const formData = new FormData()
    formData.append('excel', excelFile)

    const res = await fetch('/api/parse-excel', { method: 'POST', body: formData })
    const data = await res.json()

    setUploadingFile(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    setPriceRows(data.priceRows)
  }

  function proceed() {
    if (priceRows.length === 0) return
    sessionStorage.setItem('pdc:step2', JSON.stringify({
      brandsAssets,
      priceRows,
      language,
      buyer: { company, contact },
    }))
    router.push('/step3')
  }

  // Compute matched products across all brand contents using fuzzy matching
  const allProducts = brandsAssets.flatMap(ba =>
    (ba.brandContent?.products ?? []).map(p => ({ id: p.id, name: p.name }))
  )
  const matchResults = allProducts.map(p => {
    const matched = priceRows.find(r => fuzzyProductMatch(p.id, p.name, r.productId))
    return { product: p, matchedRow: matched ?? null }
  })

  const ready = priceRows.length > 0

  return (
    <div>
      <h1 className="text-2xl font-black italic uppercase tracking-tight mb-1">
        Step 2 — Pricing &amp; Buyer
      </h1>
      <p className="text-xs text-zinc-500 font-mono mb-8">
        Enter buyer details and load the value-chain Excel.
      </p>

      {/* Buyer info */}
      <div className="border border-zinc-800 p-5 mb-4">
        <div className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 mb-4">Buyer</div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#f8d418] font-mono block mb-1">Company name</label>
            <input
              className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
              placeholder="Retailer B.V."
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[#f8d418] font-mono block mb-1">Contact name</label>
            <input
              className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
              placeholder="Jane Smith"
              value={contact}
              onChange={e => setContact(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Value chain Excel */}
      <div className="border border-zinc-800 p-5 mb-4">
        <div className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 mb-1">Value Chain Excel</div>
        <p className="text-xs text-zinc-600 font-mono mb-2">
          Upload a workbook with a sheet named <span className="text-zinc-300">Pricing</span> using the canonical column headers (<span className="text-zinc-300">productId, brandName, deliveryPriceExcl, deliveryPriceIncl, rsp, marginExcl, marginIncl</span>).
        </p>
        <p className="text-xs text-zinc-600 font-mono mb-4">
          <a href="/value-chain-template.xlsx" download className="underline hover:text-[#f8d418]">Download the template</a> and paste your data from SharePoint into it.
        </p>
        <div className="flex gap-2 items-center">
          <label className="cursor-pointer border border-zinc-600 text-zinc-400 text-xs font-mono px-3 py-2 hover:border-[#f8d418] hover:text-white transition-colors">
            {excelFile ? excelFile.name : 'Choose value-chain.xlsx'}
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0] || null
                setExcelFile(f)
                if (f) {
                  setUploadingFile(true)
                  setError(null)
                  const fd = new FormData()
                  fd.append('excel', f)
                  fetch('/api/parse-excel', { method: 'POST', body: fd })
                    .then(r => r.json())
                    .then(data => {
                      setUploadingFile(false)
                      if (data.error) { setError(data.error); return }
                      setPriceRows(data.priceRows)
                    })
                    .catch(() => setUploadingFile(false))
                }
              }}
            />
          </label>
          {uploadingFile && <span className="text-xs text-zinc-500 font-mono">Parsing…</span>}
        </div>
      </div>

      {error && <p className="text-red-400 text-xs font-mono mb-4">{error}</p>}

      {priceRows.length > 0 && (
        <div className="border border-zinc-800 p-4 mb-6">
          <p className="text-xs font-bold text-[#f8d418] tracking-[2px] uppercase mb-2">Excel loaded</p>
          <p className="text-xs text-zinc-400 font-mono mb-3">
            Found {priceRows.length} price row(s)
          </p>
          {allProducts.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold tracking-[1.5px] uppercase text-zinc-600 mb-1">Product matching</p>
              {matchResults.map(({ product, matchedRow }) => (
                <div key={product.id} className="flex gap-2 items-baseline text-xs font-mono mb-0.5">
                  <span className="text-zinc-400">{product.name}</span>
                  <span className="text-zinc-700">→</span>
                  {matchedRow
                    ? <>
                        <span className="text-emerald-400">{matchedRow.productId}</span>
                        <span className="text-zinc-600">excl {matchedRow.deliveryPriceExcl}</span>
                        <span className="text-zinc-600">incl {matchedRow.deliveryPriceIncl}</span>
                        <span className="text-zinc-500">RSP {matchedRow.rsp}</span>
                      </>
                    : <span className="text-red-500">no match</span>
                  }
                </div>
              ))}
            </div>
          )}
          <details className="text-xs font-mono text-zinc-700">
            <summary className="cursor-pointer hover:text-zinc-500 mb-1">All Excel rows ({priceRows.length})</summary>
            <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto mt-1">
              {priceRows.map((row, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-zinc-500 w-28 truncate">{row.productId}</span>
                  <span className="text-zinc-700 w-20 truncate">{row.brandName}</span>
                  <span>excl {row.deliveryPriceExcl}</span>
                  <span>incl {row.deliveryPriceIncl}</span>
                  <span>RSP {row.rsp}</span>
                  <span>m.excl {row.marginExcl}</span>
                  <span>m.incl {row.marginIncl}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Language */}
      <div className="flex gap-3 items-center mb-6">
        <span className="text-xs font-bold tracking-[2px] uppercase text-zinc-600">Language:</span>
        {(['en', 'nl'] as const).map(l => (
          <button
            key={l}
            className={`text-xs font-bold tracking-[2px] uppercase px-4 py-2 border ${
              language === l
                ? 'bg-[#f8d418] border-[#f8d418] text-black'
                : 'border-zinc-700 text-zinc-500'
            }`}
            onClick={() => setLanguage(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mt-2">
        <button
          className="border border-zinc-700 text-zinc-500 text-xs font-bold tracking-[2px] uppercase px-4 py-2"
          onClick={() => router.push('/')}
        >
          ← Back
        </button>
        <button
          className="bg-[#f8d418] text-black text-xs font-bold tracking-[2px] uppercase px-6 py-2 disabled:opacity-40 ml-auto"
          onClick={proceed}
          disabled={!ready}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
