import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option, Tuple } from 'effect'
import * as _ from '../../src/types/OrcidLocale.ts'
import * as fc from '../fc.ts'

describe('isOrcidLocale', () => {
  test.prop([fc.orcidLocale()])('with an ORCID locale', locale => {
    expect(_.isOrcidLocale(locale)).toBeTruthy()
  })

  test.prop([fc.string({ minLength: 3 })], { examples: [['en_US'], ['EN'], ['lb']] })(
    'with a non-ORCID locale',
    string => {
      expect(_.isOrcidLocale(string)).toBeFalsy()
    },
  )

  test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
    expect(_.isOrcidLocale(value)).toBeFalsy()
  })
})

describe('parse', () => {
  test.prop([fc.orcidLocale().map(locale => Tuple.make<[string, _.OrcidLocale]>(locale, locale))], {
    examples: [[['en-US', 'en']], [['en-US-x-twain', 'en']], [['es-419', 'es']], [['zh-CN', 'zh_CN']]],
  })('with an ORCID locale', ([input, expected]) => {
    const actual = _.parse(input)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  test.prop([fc.string({ minLength: 3 })], { examples: [['EN'], ['lb'], ['sv-SE'], ['zh_SG']] })(
    'with a non-ORCID locale',
    input => {
      const actual = _.parse(input)

      expect(actual).toStrictEqual(Option.none())
    },
  )
})
