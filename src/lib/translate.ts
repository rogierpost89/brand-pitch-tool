import Anthropic from '@anthropic-ai/sdk'
import type { TranslationMap } from './types'

export async function translateToNl(fields: TranslationMap): Promise<TranslationMap> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Translate the following English marketing copy to contemporary Dutch.
Use natural, modern Dutch for retail trade buyers. No overly formal language.
Preserve any punctuation patterns like · or —.
Return as JSON with identical keys. No markdown, just the JSON object.

${JSON.stringify(fields, null, 2)}`,
    }],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Translation returned no JSON')

  return JSON.parse(match[0]) as TranslationMap
}
