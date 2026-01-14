import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Either, Schema, Tuple } from 'effect'
import * as _ from '../../src/types/SciProfilesId.ts'
import * as fc from '../fc.ts'

describe('SciProfilesIdSchema', () => {
  describe('decode', () => {
    test.prop([fc.sciProfilesId().map(String)], {
      examples: [['92927'], ['94648'], ['118021']],
    })('with an ID', string => {
      const actual = Schema.decodeSync(_.SciProfilesIdSchema)(string)

      expect(actual).toStrictEqual(string)
    })

    test.prop([fc.string().filter(string => !/^[1-9]/.test(string))], {
      examples: [['not-an-id'], ['092927'], [' 92927']],
    })('with a non-ID string', string => {
      const actual = Schema.decodeEither(_.SciProfilesIdSchema)(string)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
      const actual = Schema.decodeUnknownEither(_.SciProfilesIdSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.sciProfilesId()])('encode', sciProfilesId => {
    const actual = Schema.encodeSync(_.SciProfilesIdSchema)(sciProfilesId)

    expect(actual).toStrictEqual(sciProfilesId)
  })
})

describe('SciProfilesIdFromUrlSchema', () => {
  describe('decode', () => {
    test.prop([fc.sciProfilesId().map(id => Tuple.make(`https://sciprofiles.com/profile/${id}`, id))], {
      examples: [
        [['https://sciprofiles.com/profile/92927', _.SciProfilesId('92927')]],
        [['https://sciprofiles.com/profile/94648', _.SciProfilesId('94648')]],
        [['https://sciprofiles.com/profile/118021', _.SciProfilesId('118021')]],
      ],
    })('with an ID', ([input, expected]) => {
      const actual = Schema.decodeUnknownSync(_.SciProfilesIdFromUrlSchema)(input)

      expect(actual).toStrictEqual(expected)
    })

    test.prop([fc.string()], {
      examples: [
        ['https://sciprofiles.com/'],
        ['https://sciprofiles.com/user/publications/92927'],
        [' https://sciprofiles.com/profile/92927'],
        ['https://sciprofiles.com/profile/092927'],
      ],
    })('with a non-ID string', string => {
      const actual = Schema.decodeUnknownEither(_.SciProfilesIdFromUrlSchema)(string)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string')])('with a non-string', value => {
      const actual = Schema.decodeUnknownEither(_.SciProfilesIdFromUrlSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.sciProfilesId()])('encode', sciProfilesId => {
    const actual = Schema.encodeSync(_.SciProfilesIdFromUrlSchema)(sciProfilesId)

    expect(actual).toStrictEqual(`https://sciprofiles.com/profile/${sciProfilesId}`)
  })
})
