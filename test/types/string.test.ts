import { describe, expect, it } from '@effect/vitest'
import { Either, Schema } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../../src/types/NonEmptyString.ts'
import * as fc from '../fc.ts'

describe('NonEmptyStringC', () => {
  describe('decode', () => {
    it.prop('with a non-empty string', [fc.string({ unit: fc.alphanumeric(), minLength: 1 })], ([string]) => {
      const actual = _.NonEmptyStringC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    it.prop('with an empty string', [fc.string({ unit: fc.invisibleCharacter() })], ([string]) => {
      const actual = _.NonEmptyStringC.decode(string)

      expect(actual).toStrictEqual(D.failure(string, 'NonEmptyString'))
    })

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = _.NonEmptyStringC.decode(value)

      expect(actual).toStrictEqual(D.failure(value, 'string'))
    })
  })

  it.prop('encode', [fc.nonEmptyString()], ([string]) => {
    const actual = _.NonEmptyStringC.encode(string)

    expect(actual).toStrictEqual(string)
  })
})

describe('NonEmptyStringSchema', () => {
  describe('decode', () => {
    it.prop('with a non-empty string', [fc.string({ unit: fc.alphanumeric(), minLength: 1 })], ([string]) => {
      const actual = Schema.decodeSync(_.NonEmptyStringSchema)(string)

      expect(actual).toStrictEqual(string)
    })

    it.prop('with an empty string', [fc.string({ unit: fc.invisibleCharacter() })], ([string]) => {
      const actual = Either.mapLeft(Schema.decodeEither(_.NonEmptyStringSchema)(string), ArrayFormatter.formatErrorSync)

      expect(actual).toStrictEqual(Either.left([expect.objectContaining({ message: 'string is empty' })]))
    })

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = Schema.decodeUnknownEither(_.NonEmptyStringSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  it.prop('encode', [fc.pseudonym()], ([pseudonym]) => {
    const actual = Schema.encodeSync(_.NonEmptyStringSchema)(pseudonym)

    expect(actual).toStrictEqual(pseudonym)
  })
})

describe('isNonEmptyString', () => {
  describe('decode', () => {
    it.prop('with a non-empty string', [fc.string({ unit: fc.alphanumeric(), minLength: 1 })], ([string]) => {
      expect(_.isNonEmptyString(string)).toBe(true)
    })

    it.prop('with an empty string', [fc.string({ unit: fc.invisibleCharacter() })], ([string]) => {
      expect(_.isNonEmptyString(string)).toBe(false)
    })
  })
})
