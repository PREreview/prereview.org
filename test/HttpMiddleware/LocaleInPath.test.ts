import { describe, expect, it } from '@jest/globals'
import { Option } from 'effect'
import * as _ from '../../src/HttpMiddleware/LocaleInPath.js'
import type { SupportedLocale } from '../../src/locales/index.js'

const localeInPathCases = [
  ['/', '/', Option.none()],
  ['/en-us', '/', Option.some('en-US')],
  ['/en-us/', '/', Option.some('en-US')],
  // ['/en-us?foo=bar', '/?foo=bar', Option.some('en-US')],
  ['/?foo=bar', '/?foo=bar', Option.none()],
  ['/about', '/about', Option.none()],
  ['/en-us/about', '/about', Option.some('en-US')],
  ['/en-us/about?foo=bar', '/about?foo=bar', Option.some('en-US')],
] satisfies ReadonlyArray<[string, string, Option.Option<SupportedLocale>]>

describe('removeLocaleFromPath', () => {
  it.each(localeInPathCases)('returns the expected path without a locale for %s', (input, expectedPath) => {
    expect(_.removeLocaleFromPath(input)).toBe(expectedPath)
  })
})

describe('getLocaleFromPath', () => {
  it.each(localeInPathCases)('returns the expected locale for %s', (input, _expectedPath, expectedLocale) => {
    expect(_.getLocaleFromPath(input)).toStrictEqual(expectedLocale)
  })
})
