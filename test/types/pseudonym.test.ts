import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as D from 'io-ts/Decoder'
import * as _ from '../../src/types/pseudonym'
import * as fc from '../fc'

describe('PseudonymC', () => {
  describe('decode', () => {
    test.prop([fc.pseudonym()])('with a pseudonym', string => {
      const actual = _.PseudonymC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    test.prop([fc.string()])('with a non-pseudonym', string => {
      const actual = _.PseudonymC.decode(string)

      expect(actual).toStrictEqual(D.failure(string, 'Pseudonym'))
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
      const actual = _.PseudonymC.decode(value)

      expect(actual).toStrictEqual(D.failure(value, 'string'))
    })
  })

  test.prop([fc.pseudonym()])('encode', pseudonym => {
    const actual = _.PseudonymC.encode(pseudonym)

    expect(actual).toStrictEqual(pseudonym)
  })
})

describe('isPseudonym', () => {
  test.prop([fc.pseudonym()], {
    examples: [
      ['Orange Panda' as _.Pseudonym],
      ['Green Hawk' as _.Pseudonym],
      ['Blue Sheep' as _.Pseudonym],
      ['Red Hummingbird' as _.Pseudonym],
      ['White Frog' as _.Pseudonym],
      ['Pink Jellyfish' as _.Pseudonym],
      ['Sapphire Kangaroo' as _.Pseudonym],
      ['Black Dog' as _.Pseudonym],
    ],
  })('with a pseudonym', string => {
    expect(_.isPseudonym(string)).toBe(true)
  })

  test.prop([fc.string()], {
    examples: [['Orange panda'], ['orange panda'], ['ORANGE PANDA']],
  })('with a non-pseudonym', string => {
    expect(_.isPseudonym(string)).toBe(false)
  })
})
