import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as D from 'io-ts/Decoder'
import * as _ from '../src/email-address'
import * as fc from './fc'

describe('EmailAddressC', () => {
  describe('decode', () => {
    test.prop([fc.emailAddress()])('with an email address', string => {
      const actual = _.EmailAddressC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    test.prop([fc.string()])('with a non-email address', string => {
      const actual = _.EmailAddressC.decode(string)

      expect(actual).toStrictEqual(D.failure(string, 'EmailAddress'))
    })

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
