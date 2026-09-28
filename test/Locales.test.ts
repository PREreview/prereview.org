import { describe, expect, it } from '@effect/vitest'
import * as _ from '../src/Locales.ts'
import * as fc from './fc.ts'

describe('languageAttributesFor', () => {
  it.each([
    ['ar', 'ar', 'rtl'],
    ['arb', 'arb', 'rtl'],
    ['en', 'en', 'ltr'],
    ['es-419', 'es-419', 'ltr'],
    ['uz-Arab', 'uz-Arab', 'rtl'],
    ['uz-Latn', 'uz-Latn', 'ltr'],
  ])('%s', (locale, expectedLang, expectedDir) => {
    const actual = _.languageAttributesFor(locale)

    const expected = `lang="${expectedLang}" dir="${expectedDir}"`

    expect(actual.toString()).toBe(expected)
  })

  it.prop('works with all locales', [fc.oneof(fc.locale(), fc.languageCode())], ([locale]) => {
    const actual = _.languageAttributesFor(locale)

    expect(actual.toString()).toMatch(`lang="${locale}" dir="`)
  })
})

describe('getDirectionMarkFor', () => {
  it.each([
    ['ar', '\u061c'],
    ['arb', '\u061c'],
    ['en', '\u200e'],
    ['es-419', '\u200e'],
    ['he', '\u200f'],
    ['uz-Arab', '\u061c'],
    ['uz-Latn', '\u200e'],
  ])('%s', (locale, expected) => {
    const actual = _.getDirectionMarkFor(locale)

    expect(actual).toBe(expected)
  })
})
