import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Either, Schema } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../../src/types/Pseudonym.ts'
import * as fc from '../fc.ts'

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

describe('PseudonymSchema', () => {
  describe('decode', () => {
    test.prop([fc.pseudonym()])('with a pseudonym', string => {
      const actual = Schema.decodeSync(_.PseudonymSchema)(string)

      expect(actual).toStrictEqual(string)
    })

    test.prop([fc.string()])('with a non-pseudonym', string => {
      const actual = Either.mapLeft(Schema.decodeEither(_.PseudonymSchema)(string), ArrayFormatter.formatErrorSync)

      expect(actual).toStrictEqual(
        Either.left([
          expect.objectContaining({ message: expect.stringMatching(/^(?:not a pseudonym|string is empty)$/) }),
        ]),
      )
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
      const actual = Schema.decodeUnknownEither(_.PseudonymSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.pseudonym()])('encode', pseudonym => {
    const actual = Schema.encodeSync(_.PseudonymSchema)(pseudonym)

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
