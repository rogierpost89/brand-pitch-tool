import { describe, it, expect } from 'vitest'
import { parseBrandYaml } from './parse-yaml'

const VALID_YAML = `
buyer:
  company: "Albert Heijn"
  contact: "Jan de Vries"
brands:
  - name: "La Mundial Barcelona"
    url: "https://lamundialbarcelona.com"
    intro: "Wine-based sparkling."
    products:
      - id: clarea
        name: "Clarea"
        intro: "Peach sparkling."
        tagline: "Escape the ordinary"
        usps:
          - "Fine bubbles"
        why_it_sells:
          - "New category"
        annual_volume_btl: 2400
        image_url: ""
`

describe('parseBrandYaml', () => {
  it('parses a valid brand.yaml', () => {
    const result = parseBrandYaml(VALID_YAML)
    expect(result.buyer.company).toBe('Albert Heijn')
    expect(result.brands).toHaveLength(1)
    expect(result.brands[0].products).toHaveLength(1)
    expect(result.brands[0].products[0].id).toBe('clarea')
  })

  it('throws when buyer is missing', () => {
    expect(() => parseBrandYaml('brands: []')).toThrow('buyer')
  })

  it('throws when brands is missing', () => {
    expect(() => parseBrandYaml('buyer:\n  company: AH\n  contact: Jan')).toThrow('brands')
  })

  it('parses multiple brands', () => {
    const yaml = VALID_YAML + `
  - name: "Roots Divino"
    url: "https://finestroots.com"
    intro: "0% aperitifs."
    products:
      - id: rosso
        name: "Aperitif Rosso"
        intro: "Bittersweet."
        tagline: "Back to the roots"
        usps: ["Double Gold"]
        why_it_sells: ["No-alc trend"]
        annual_volume_btl: 1200
        image_url: ""
`
    const result = parseBrandYaml(yaml)
    expect(result.brands).toHaveLength(2)
    expect(result.brands[1].name).toBe('Roots Divino')
  })
})
