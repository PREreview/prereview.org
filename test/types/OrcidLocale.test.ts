import { describe, expect, it } from '@effect/vitest'
import { Option, Tuple } from 'effect'
import * as _ from '../../src/types/OrcidLocale.ts'
import * as fc from '../fc.ts'

describe('isOrcidLocale', () => {
  it.prop('with an ORCID locale', [fc.orcidLocale()], ([locale]) => {
    expect(_.isOrcidLocale(locale)).toBeTruthy()
  })

  it.prop(
    'with a non-ORCID locale',
    [fc.string({ minLength: 3 })],
    ([string]) => {
      expect(_.isOrcidLocale(string)).toBeFalsy()
    },
    {
      fastCheck: {
        examples: [['en_US'], ['EN'], ['lb']],
      },
    },
  )

  it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
    expect(_.isOrcidLocale(value)).toBeFalsy()
  })
})

describe('parse', () => {
  it.prop(
    'with an ORCID locale',
    [fc.orcidLocale().map(locale => Tuple.make<[string, _.OrcidLocale]>(locale, locale))],
    ([[input, expected]]) => {
      const actual = _.parse(input)

      expect(actual).toStrictEqual(Option.some(expected))
    },
    {
      fastCheck: {
        examples: [[['en-US', 'en']], [['en-US-x-twain', 'en']], [['es-419', 'es']], [['zh-CN', 'zh_CN']]],
      },
    },
  )

  it.prop(
    'with a non-ORCID locale',
    [fc.string({ minLength: 3 })],
    ([input]) => {
      const actual = _.parse(input)

      expect(actual).toStrictEqual(Option.none())
    },
    {
      fastCheck: {
        examples: [['EN'], ['lb'], ['sv-SE'], ['zh_SG']],
      },
    },
  )
})
