import { describe, expect, it } from '@jest/globals'
import * as _ from '../../src/HttpMiddleware/removeLocaleFromPath.js'

describe('removeLocaleFromPath', () => {
  it.each([
    ['/', '/'],
    // ['/en-us', '/'],
    ['/en-us/', '/'],
    // ['/en-us?foo=bar', '/?foo=bar'],
    ['/?foo=bar', '/?foo=bar'],
    ['/about', '/about'],
    ['/en-us/about', '/about'],
    ['/en-us/about?foo=bar', '/about?foo=bar'],
  ])('returns the expected path without a locale', (input, expected) => {
    expect(_.removeLocaleFromPath(input)).toBe(expected)
  })
})
