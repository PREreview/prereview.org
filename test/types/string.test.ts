import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as D from 'io-ts/Decoder'
import * as _ from '../../src/types/string'
import * as fc from '../fc'

describe('NonEmptyStringC', () => {
  describe('decode', () => {
    test.prop([fc.stringOf(fc.alphanumeric(), { minLength: 1 })])('with a non-empty string', string => {
      const actual = _.NonEmptyStringC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    test.prop([fc.stringOf(fc.invisibleCharacter())])('with an empty string', string => {
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

describe('isNonEmptyString', () => {
  describe('decode', () => {
    test.prop([fc.stringOf(fc.alphanumeric(), { minLength: 1 })])('with a non-empty string', string => {
      expect(_.isNonEmptyString(string)).toBe(true)
    })

    test.prop([fc.stringOf(fc.invisibleCharacter())])('with an empty string', string => {
      expect(_.isNonEmptyString(string)).toBe(false)
    })
  })
})
