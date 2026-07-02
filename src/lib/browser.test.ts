import { describe, it, expect } from 'vitest'
import { IS_SERVERLESS, launchBrowser } from './browser'

describe('browser launcher', () => {
  it('exposes a boolean serverless flag and a launch function', () => {
    expect(typeof IS_SERVERLESS).toBe('boolean')
    expect(typeof launchBrowser).toBe('function')
  })
})
