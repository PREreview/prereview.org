import { describe, expect, it } from '@effect/vitest'
import * as _ from '../src/Locales.ts'
import * as fc from './fc.ts'

describe('languageAttributesFor', () => {
  it.each([
    ['ar', 'ar', 'rtl'],
    ['en', 'en', 'ltr'],
    ['es-419', 'es-419', 'ltr'],
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
