import { NextRequest, NextResponse } from 'next/server'
import { parseBrandYaml } from '@/lib/parse-yaml'
import { parseExcel } from '@/lib/parse-excel'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const yamlFile = formData.get('yaml') as File | null
    const excelFile = formData.get('excel') as File | null

    if (!yamlFile) return NextResponse.json({ error: 'Missing yaml file' }, { status: 400 })
    if (!excelFile) return NextResponse.json({ error: 'Missing excel file' }, { status: 400 })

    const yamlText = await yamlFile.text()
    const excelBuffer = Buffer.from(await excelFile.arrayBuffer())

    let yamlData
    try {
      yamlData = parseBrandYaml(yamlText)
    } catch (err) {
      return NextResponse.json(
        { error: `YAML error: ${err instanceof Error ? err.message : err}` },
        { status: 422 }
      )
    }

    let priceRows
    try {
      priceRows = parseExcel(excelBuffer)
    } catch (err) {
      return NextResponse.json(
        { error: `Excel error: ${err instanceof Error ? err.message : err}` },
        { status: 422 }
      )
    }

    // Check for unmatched products
    const yamlProductIds = yamlData.brands.flatMap(b => b.products.map(p => p.id))
    const excelProductIds = priceRows.map(r => r.productId)
    const unmatched = yamlProductIds.filter(id => !excelProductIds.includes(id))

    return NextResponse.json({ yamlData, priceRows, unmatched })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
