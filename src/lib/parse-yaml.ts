import yaml from 'js-yaml'
import type { YamlInput } from './types'

export function parseBrandYaml(content: string): YamlInput {
  const parsed = yaml.load(content) as Record<string, unknown>

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML: expected an object')
  }
  if (!parsed.buyer) {
    throw new Error('brand.yaml missing required field: buyer')
  }
  if (!parsed.brands) {
    throw new Error('brand.yaml missing required field: brands')
  }

  return parsed as unknown as YamlInput
}
