import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as D from 'io-ts/Decoder'
import * as _ from '../src/string'
import * as fc from './fc'

describe('string', () => {
  describe('NonEmptyStringC', () => {
    describe('decode', () => {
      test.prop([fc.string({ minLength: 1 })])('with a non-empty string', string => {
        const actual = _.NonEmptyStringC.decode(string)

        expect(actual).toStrictEqual(D.success(string))
      })

      test('with an empty string', () => {
        const actual = _.NonEmptyStringC.decode('')

        expect(actual).toStrictEqual(D.failure('', 'NonEmptyString'))
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

  describe('isNonEmptyString', () => {
    describe('decode', () => {
      test.prop([fc.string({ minLength: 1 })])('with a non-empty string', string => {
        expect(_.isNonEmptyString(string)).toBe(true)
      })

      test('with an empty string', () => {
        expect(_.isNonEmptyString('')).toBe(false)
      })
    })
  })
})
