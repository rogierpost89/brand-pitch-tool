'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { YamlInput, PriceRow } from '@/lib/types'

export default function Step2() {
  const router = useRouter()
  const [yamlFile, setYamlFile] = useState<File | null>(null)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [yamlData, setYamlData] = useState<YamlInput | null>(null)
  const [priceRows, setPriceRows] = useState<PriceRow[]>([])
  const [language, setLanguage] = useState<'en' | 'nl'>('en')

  useEffect(() => {
    const stored = sessionStorage.getItem('pdc:brands-assets')
    if (!stored) router.push('/')
  }, [router])

  async function parseFiles() {
    if (!yamlFile || !excelFile) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('yaml', yamlFile)
    formData.append('excel', excelFile)

    const res = await fetch('/api/parse-files', { method: 'POST', body: formData })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) {
      setError(data.error)
      return
    }

    setYamlData(data.yamlData)
    setPriceRows(data.priceRows)
    setUnmatched(data.unmatched)
  }

  function proceed() {
    if (!yamlData) return
    const brandsAssets = JSON.parse(sessionStorage.getItem('pdc:brands-assets') || '[]')
    sessionStorage.setItem('pdc:step2', JSON.stringify({
      brandsAssets,
      yamlData,
      priceRows,
      language,
    }))
    router.push('/step3')
  }

  const ready = yamlData !== null && unmatched.length === 0

  return (
    <div>
      <h1 className="text-2xl font-black italic uppercase tracking-tight mb-1">
        Step 2 — Content
      </h1>
      <p className="text-xs text-zinc-500 font-mono mb-8">
        Upload your brand.yaml and value-chain.xlsx.
      </p>

      <div className="flex flex-col gap-4 mb-6">
        <div className="border border-zinc-800 p-5">
          <div className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 mb-3">
            brand.yaml
          </div>
          <input
            type="file"
            accept=".yaml,.yml"
            className="text-xs text-zinc-400 font-mono"
            onChange={e => setYamlFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="border border-zinc-800 p-5">
          <div className="text-xs font-bold tracking-[2px] uppercase text-zinc-600 mb-3">
            value-chain.xlsx
          </div>
          <input
            type="file"
            accept=".xlsx"
            className="text-xs text-zinc-400 font-mono"
            onChange={e => setExcelFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

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

      <button
        className="bg-zinc-800 text-white text-xs font-bold tracking-[2px] uppercase px-5 py-2 mb-6 disabled:opacity-40"
        onClick={parseFiles}
        disabled={!yamlFile || !excelFile || loading}
      >
        {loading ? 'Parsing…' : 'Parse files'}
      </button>

      {error && <p className="text-red-400 text-xs font-mono mb-4">{error}</p>}

      {unmatched.length > 0 && (
        <div className="border border-yellow-800 bg-yellow-950 p-4 mb-4">
          <p className="text-xs font-bold text-[#f8d418] mb-1">Unmatched products</p>
          <p className="text-xs text-zinc-400 font-mono">
            These product IDs are in brand.yaml but not in the Excel: {unmatched.join(', ')}
          </p>
        </div>
      )}

      {yamlData && (
        <div className="border border-zinc-800 p-4 mb-6">
          <p className="text-xs font-bold text-[#f8d418] tracking-[2px] uppercase mb-2">Parsed</p>
          <p className="text-xs text-zinc-400 font-mono">
            {yamlData.brands.length} brand(s) · {yamlData.brands.reduce((s, b) => s + b.products.length, 0)} product(s)
          </p>
          <p className="text-xs text-zinc-500 font-mono">
            Buyer: {yamlData.buyer.company} · {yamlData.buyer.contact}
          </p>
          <p className="text-xs text-zinc-500 font-mono">
            {priceRows.length} price rows from Excel
          </p>
        </div>
      )}

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
