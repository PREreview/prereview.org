import { it } from '@effect/vitest'
import { Either, Schema } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import * as D from 'io-ts/lib/Decoder.js'
import { describe, expect } from 'vitest'
import * as _ from '../../src/types/EmailAddress.ts'
import * as fc from '../fc.ts'

describe('EmailAddressC', () => {
  describe('decode', () => {
    it.prop('with an email address', [fc.emailAddress()], ([string]) => {
      const actual = _.EmailAddressC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    it.prop(
      'with a non-email address',
      [fc.string().filter(string => !string.includes('.') || !string.includes('@') || /\s/g.test(string))],
      ([string]) => {
        const actual = _.EmailAddressC.decode(string)

        expect(actual).toStrictEqual(D.failure(string, 'EmailAddress'))
      },
    )

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = _.EmailAddressC.decode(value)

      expect(actual).toStrictEqual(D.failure(value, 'string'))
    })
  })

  it.prop('encode', [fc.emailAddress()], ([string]) => {
    const actual = _.EmailAddressC.encode(string)

    expect(actual).toStrictEqual(string)
  })
})

describe('EmailAddressSchema', () => {
  describe('decode', () => {
    it.prop('with an email address', [fc.emailAddress()], ([string]) => {
      const actual = Schema.decodeSync(_.EmailAddressSchema)(string)

      expect(actual).toStrictEqual(string)
    })

    it.prop(
      'with a non-email address',
      [fc.string().filter(string => !string.includes('.') || !string.includes('@') || /\s/g.test(string))],
      ([string]) => {
        const actual = Either.mapLeft(Schema.decodeEither(_.EmailAddressSchema)(string), ArrayFormatter.formatErrorSync)

        expect(actual).toStrictEqual(Either.left([expect.objectContaining({ message: 'not an email address' })]))
      },
    )

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = Schema.decodeUnknownEither(_.EmailAddressSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  it.prop('encode', [fc.emailAddress()], ([string]) => {
    const actual = Schema.encodeSync(_.EmailAddressSchema)(string)

    expect(actual).toStrictEqual(string)
  })
})
