'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PriceRow, ExtractedBrand, BrandAssets } from '@/lib/types'

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
  const [excelUrl, setExcelUrl] = useState('')
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priceRows, setPriceRows] = useState<PriceRow[]>([])
  const [language, setLanguage] = useState<'en' | 'nl'>('en')

  useEffect(() => {
    const stored = sessionStorage.getItem('pdc:brands-assets')
    if (!stored) { router.push('/'); return }
    setBrandsAssets(JSON.parse(stored) as BrandAssetEntry[])
  }, [router])

  async function fetchExcelFromUrl() {
    if (!excelUrl) return
    setFetchingUrl(true)
    setError(null)

    const res = await fetch('/api/fetch-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: excelUrl }),
    })

    const data = await res.json()
    setFetchingUrl(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    setPriceRows(data.priceRows)
  }

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

  // Compute matched products across all brand contents
  const allProductIds = brandsAssets.flatMap(ba =>
    (ba.brandContent?.products ?? []).map(p => p.id)
  )
  const priceProductIds = priceRows.map(r => r.productId)
  const matchedIds = allProductIds.filter(id => priceProductIds.includes(id))

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
        <div className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 mb-4">Value Chain Excel</div>

        {/* URL fetch */}
        <div className="mb-4">
          <label className="text-xs text-[#f8d418] font-mono block mb-1">
            Paste your OneDrive or SharePoint share link
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-zinc-900 border border-zinc-700 text-white text-sm font-mono px-3 py-2 outline-none focus:border-[#f8d418]"
              placeholder="https://onedrive.live.com/..."
              value={excelUrl}
              onChange={e => setExcelUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchExcelFromUrl()}
            />
            <button
              className="bg-zinc-700 text-white text-xs font-bold tracking-[2px] uppercase px-4 py-2 disabled:opacity-40 hover:bg-zinc-600"
              onClick={fetchExcelFromUrl}
              disabled={fetchingUrl || !excelUrl}
            >
              {fetchingUrl ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
          <p className="text-xs text-zinc-600 font-mono mt-1">
            In SharePoint: right-click the file → Copy link. Or use the direct download URL.
          </p>
        </div>

        {/* File upload fallback */}
        <div className="border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-600 font-mono mb-2">or upload file directly</p>
          <div className="flex gap-2 items-center">
            <label className="cursor-pointer border border-zinc-600 text-zinc-400 text-xs font-mono px-3 py-1.5 hover:border-[#f8d418] hover:text-white transition-colors">
              {excelFile ? excelFile.name : 'Choose .xlsx file'}
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={e => setExcelFile(e.target.files?.[0] || null)}
              />
            </label>
            {excelFile && (
              <button
                className="bg-zinc-700 text-white text-xs font-bold tracking-[2px] uppercase px-4 py-1.5 disabled:opacity-40 hover:bg-zinc-600"
                onClick={uploadExcelFile}
                disabled={uploadingFile}
              >
                {uploadingFile ? 'Uploading…' : 'Upload'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs font-mono mb-4">{error}</p>}

      {priceRows.length > 0 && (
        <div className="border border-zinc-800 p-4 mb-6">
          <p className="text-xs font-bold text-[#f8d418] tracking-[2px] uppercase mb-2">Excel loaded</p>
          <p className="text-xs text-zinc-400 font-mono mb-2">
            Found {priceRows.length} price row(s)
          </p>
          {allProductIds.length > 0 && (
            <p className="text-xs text-zinc-500 font-mono mb-2">
              Matched {matchedIds.length} / {allProductIds.length} product(s): {matchedIds.join(', ') || 'none'}
            </p>
          )}
          <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
            {priceRows.map((row, i) => (
              <div key={i} className="flex gap-3 text-xs font-mono text-zinc-600">
                <span className="text-zinc-400 w-28 truncate">{row.productId}</span>
                <span className="text-zinc-600 w-24 truncate">{row.brandName}</span>
                <span>{row.deliveryPrice}</span>
                <span className="text-zinc-700">RSP {row.rsp}</span>
                <span className="text-zinc-700">{row.margin}</span>
              </div>
            ))}
          </div>
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
