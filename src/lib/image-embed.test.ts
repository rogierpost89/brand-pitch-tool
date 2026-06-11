import { describe, it, expect, vi, beforeEach } from 'vitest'
import { imageToDataUri } from './image-embed'

const FAKE_IMAGE = Buffer.from('fakeimagebytes')
const FAKE_B64 = FAKE_IMAGE.toString('base64')
// Node.js Buffer.from() uses a shared memory pool, so .buffer is 8192 bytes.
// Use a standalone ArrayBuffer that matches what a real fetch().arrayBuffer() returns.
const FAKE_ARRAY_BUFFER = new Uint8Array(FAKE_IMAGE).buffer

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('imageToDataUri', () => {
  it('returns a data URI with correct content-type', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => h === 'content-type' ? 'image/png' : null },
      arrayBuffer: async () => FAKE_ARRAY_BUFFER,
    } as unknown as Response)

    const result = await imageToDataUri('https://example.com/logo.png')
    expect(result).toBe(`data:image/png;base64,${FAKE_B64}`)
  })

  it('sends a Mozilla User-Agent header to bypass hotlink protection', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => FAKE_ARRAY_BUFFER,
    } as unknown as Response)
    global.fetch = mockFetch

    await imageToDataUri('https://example.com/img.jpg')
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect((opts.headers as Record<string, string>)['User-Agent']).toMatch(/Mozilla/)
  })

  it('throws on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    } as unknown as Response)

    await expect(imageToDataUri('https://example.com/blocked.png')).rejects.toThrow('403')
  })

  it('falls back to image/jpeg when content-type header is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      arrayBuffer: async () => FAKE_ARRAY_BUFFER,
    } as unknown as Response)

    const result = await imageToDataUri('https://example.com/img')
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })
})
