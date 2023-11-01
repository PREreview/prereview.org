import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as D from 'io-ts/Decoder'
import * as _ from '../../src/types/club-id'
import * as fc from '../fc'

describe('ClubIdC', () => {
  describe('decode', () => {
    test.prop([fc.clubId()])('with a club ID', string => {
      const actual = _.ClubIdC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    test.prop([fc.string()])('with a non-club ID', string => {
      const actual = _.ClubIdC.decode(string)

      expect(actual).toStrictEqual(D.failure(string, 'ClubID'))
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
      const actual = _.ClubIdC.decode(value)

      expect(actual).toStrictEqual(D.failure(value, 'string'))
    })
  })

  test.prop([fc.clubId()])('encode', clubId => {
    const actual = _.ClubIdC.encode(clubId)

    expect(actual).toStrictEqual(clubId)
  })
})

describe('isClubId', () => {
  test.prop([fc.clubId()])('with a club ID', string => {
    expect(_.isClubId(string)).toBe(true)
  })

  test.prop([fc.string()])('with a non-club ID', string => {
    expect(_.isClubId(string)).toBe(false)
  })
})
