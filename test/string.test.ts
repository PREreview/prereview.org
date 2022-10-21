import * as D from 'io-ts/Decoder'
import * as _ from '../src/string'
import * as fc from './fc'

describe('string', () => {
  describe('NonEmptyStringC', () => {
    describe('decode', () => {
      fc.test('with a non-empty string', [fc.string({ minLength: 1 })], string => {
        const actual = _.NonEmptyStringC.decode(string)

        expect(actual).toStrictEqual(D.success(string))
      })

      test('with an empty string', () => {
        const actual = _.NonEmptyStringC.decode('')

        expect(actual).toStrictEqual(D.failure('', 'NonEmptyString'))
      })

      fc.test('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], value => {
        const actual = _.NonEmptyStringC.decode(value)

        expect(actual).toStrictEqual(D.failure(value, 'string'))
      })
    })

    fc.test('encode', [fc.nonEmptyString()], string => {
      const actual = _.NonEmptyStringC.encode(string)

      expect(actual).toStrictEqual(string)
    })
  })

  describe('isNonEmptyString', () => {
    describe('decode', () => {
      fc.test('with a non-empty string', [fc.string({ minLength: 1 })], string => {
        expect(_.isNonEmptyString(string)).toBe(true)
      })

      test('with an empty string', () => {
        expect(_.isNonEmptyString('')).toBe(false)
      })
    })
  })
})
