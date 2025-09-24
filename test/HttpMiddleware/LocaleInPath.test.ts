import { describe, expect, it } from '@jest/globals'
import { Option } from 'effect'
import * as _ from '../../src/HttpMiddleware/LocaleInPath.ts'
import type { SupportedLocale } from '../../src/locales/index.ts'

const localeInPathCases = [
  ['/', '/', Option.none()],
  ['/en-us', '/', Option.some('en-US')],
  ['/en-US', '/en-US', Option.none()],
  ['/pt-br', '/', Option.some('pt-BR')],
  ['/lol-us', '/lol-us', Option.none()],
  ['/en-us/', '/', Option.some('en-US')],
  ['/pt-br/', '/', Option.some('pt-BR')],
  ['/en-us?foo=bar', '/?foo=bar', Option.some('en-US')],
  ['/pt-br?foo=bar', '/?foo=bar', Option.some('pt-BR')],
  ['/?foo=bar', '/?foo=bar', Option.none()],
  ['/about', '/about', Option.none()],
  ['/en-us/about', '/about', Option.some('en-US')],
  ['/pt-br/about', '/about', Option.some('pt-BR')],
  ['/en-us/about?foo=bar', '/about?foo=bar', Option.some('en-US')],
  ['/pt-br/about?foo=bar', '/about?foo=bar', Option.some('pt-BR')],
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
