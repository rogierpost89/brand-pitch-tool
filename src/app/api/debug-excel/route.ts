import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('excel') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  const output: Record<string, { totalRows: number; preview: string[][] }> = {}

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][]

    // Show rows 0–79, cols 0–12, with actual cell values
    const preview = rows.slice(0, 80).map(row =>
      Array.from({ length: Math.min(row.length, 13) }, (_, c) => String(row[c] ?? '').trim())
    )

    output[name] = { totalRows: rows.length, preview }
  }

  return NextResponse.json(output)
}
