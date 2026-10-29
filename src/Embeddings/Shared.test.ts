import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import { PgVector } from './Shared.js'

describe('PgVector', () => {
  it('decodes a postgres vector string to Float32Array', () => {
    const result = Schema.decodeUnknownSync(PgVector)('[1,2,3]')
    expect(result).toBeInstanceOf(Float32Array)
    expect(Array.from(result)).toEqual([1, 2, 3])
  })

  it('encodes a Float32Array to a postgres vector string', () => {
    const result = Schema.encodeSync(PgVector)(new Float32Array([1, 2, 3]))
    expect(result).toBe('[1,2,3]')
  })

  it('round-trips through decode and encode', () => {
    const original = '[1,2,3]'
    const decoded = Schema.decodeUnknownSync(PgVector)(original)
    const reencoded = Schema.encodeSync(PgVector)(decoded)
    expect(reencoded).toBe(original)
  })

  it('rejects a non-string input', () => {
    expect(() => Schema.decodeUnknownSync(PgVector)(42)).toThrow(Error)
  })
})
