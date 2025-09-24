import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Either, Schema } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../../src/types/NonEmptyString.ts'
import * as fc from '../fc.ts'

describe('NonEmptyStringC', () => {
  describe('decode', () => {
    test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 })])('with a non-empty string', string => {
      const actual = _.NonEmptyStringC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    test.prop([fc.string({ unit: fc.invisibleCharacter() })])('with an empty string', string => {
      const actual = _.NonEmptyStringC.decode(string)

      expect(actual).toStrictEqual(D.failure(string, 'NonEmptyString'))
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
      const actual = _.NonEmptyStringC.decode(value)

      expect(actual).toStrictEqual(D.failure(value, 'string'))
    })
  })

  test.prop([fc.nonEmptyString()])('encode', string => {
    const actual = _.NonEmptyStringC.encode(string)

    expect(actual).toStrictEqual(string)
  })
})

describe('NonEmptyStringSchema', () => {
  describe('decode', () => {
    test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 })])('with a non-empty string', string => {
      const actual = Schema.decodeSync(_.NonEmptyStringSchema)(string)

      expect(actual).toStrictEqual(string)
    })

    test.prop([fc.string({ unit: fc.invisibleCharacter() })])('with an empty string', string => {
      const actual = Either.mapLeft(Schema.decodeEither(_.NonEmptyStringSchema)(string), ArrayFormatter.formatErrorSync)

      expect(actual).toStrictEqual(Either.left([expect.objectContaining({ message: 'string is empty' })]))
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
      const actual = Schema.decodeUnknownEither(_.NonEmptyStringSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.pseudonym()])('encode', pseudonym => {
    const actual = Schema.encodeSync(_.NonEmptyStringSchema)(pseudonym)

    expect(actual).toStrictEqual(pseudonym)
  })
})

describe('isNonEmptyString', () => {
  describe('decode', () => {
    test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 })])('with a non-empty string', string => {
      expect(_.isNonEmptyString(string)).toBe(true)
    })

    test.prop([fc.string({ unit: fc.invisibleCharacter() })])('with an empty string', string => {
      expect(_.isNonEmptyString(string)).toBe(false)
    })
  })
})
