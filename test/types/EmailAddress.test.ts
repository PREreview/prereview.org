import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Either, Schema } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../../src/types/EmailAddress.ts'
import * as fc from '../fc.ts'

describe('EmailAddressC', () => {
  describe('decode', () => {
    test.prop([fc.emailAddress()])('with an email address', string => {
      const actual = _.EmailAddressC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    test.prop([fc.string().filter(string => !string.includes('.') || !string.includes('@') || /\s/g.test(string))])(
      'with a non-email address',
      string => {
        const actual = _.EmailAddressC.decode(string)

        expect(actual).toStrictEqual(D.failure(string, 'EmailAddress'))
      },
    )

    test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
      const actual = _.EmailAddressC.decode(value)

      expect(actual).toStrictEqual(D.failure(value, 'string'))
    })
  })

  test.prop([fc.emailAddress()])('encode', string => {
    const actual = _.EmailAddressC.encode(string)

    expect(actual).toStrictEqual(string)
  })
})

describe('EmailAddressSchema', () => {
  describe('decode', () => {
    test.prop([fc.emailAddress()])('with an email address', string => {
      const actual = Schema.decodeSync(_.EmailAddressSchema)(string)

      expect(actual).toStrictEqual(string)
    })

    test.prop([fc.string().filter(string => !string.includes('.') || !string.includes('@') || /\s/g.test(string))])(
      'with a non-email address',
      string => {
        const actual = Either.mapLeft(Schema.decodeEither(_.EmailAddressSchema)(string), ArrayFormatter.formatErrorSync)

        expect(actual).toStrictEqual(Either.left([expect.objectContaining({ message: 'not an email address' })]))
      },
    )

    test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
      const actual = Schema.decodeUnknownEither(_.EmailAddressSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.emailAddress()])('encode', string => {
    const actual = Schema.encodeSync(_.EmailAddressSchema)(string)

    expect(actual).toStrictEqual(string)
  })
})
