import { describe, expect, it } from '../vitest.ts'
import { Result, Schema, SchemaIssue } from 'effect'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../../src/types/NonEmptyString.ts'
import * as fc from '../fc.ts'

const formatError = (error: Schema.SchemaError) => SchemaIssue.makeFormatterStandardSchemaV1()(error.issue).issues

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
      const actual = Result.mapError(Schema.decodeResult(_.NonEmptyStringSchema)(string), formatError)

      expect(actual).toStrictEqual(Result.fail([expect.objectContaining({ message: 'string is empty' })]))
    })

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = Schema.decodeUnknownResult(_.NonEmptyStringSchema)(value)

      expect(actual).toStrictEqual(Result.fail(expect.anything()))
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
