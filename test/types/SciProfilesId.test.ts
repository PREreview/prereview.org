import { it } from '@effect/vitest'
import { Either, Schema, Tuple } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../src/types/SciProfilesId.ts'
import * as fc from '../fc.ts'

describe('SciProfilesIdSchema', () => {
  describe('decode', () => {
    it.prop(
      'with an ID',
      [fc.sciProfilesId().map(String)],
      ([string]) => {
        const actual = Schema.decodeSync(_.SciProfilesIdSchema)(string)

        expect(actual).toStrictEqual(string)
      },
      {
        fastCheck: {
          examples: [['92927'], ['94648'], ['118021']],
        },
      },
    )

    it.prop(
      'with a non-ID string',
      [fc.string().filter(string => !/^[1-9]/.test(string))],
      ([string]) => {
        const actual = Schema.decodeEither(_.SciProfilesIdSchema)(string)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
      {
        fastCheck: {
          examples: [['not-an-id'], ['092927'], [' 92927']],
        },
      },
    )

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = Schema.decodeUnknownEither(_.SciProfilesIdSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  it.prop('encode', [fc.sciProfilesId()], ([sciProfilesId]) => {
    const actual = Schema.encodeSync(_.SciProfilesIdSchema)(sciProfilesId)

    expect(actual).toStrictEqual(sciProfilesId)
  })
})

describe('SciProfilesIdFromUrlSchema', () => {
  describe('decode', () => {
    it.prop(
      'with an ID',
      [fc.sciProfilesId().map(id => Tuple.make(`https://sciprofiles.com/profile/${id}`, id))],
      ([[input, expected]]) => {
        const actual = Schema.decodeUnknownSync(_.SciProfilesIdFromUrlSchema)(input)

        expect(actual).toStrictEqual(expected)
      },
      {
        fastCheck: {
          examples: [
            [['https://sciprofiles.com/profile/92927', _.SciProfilesId('92927')]],
            [['https://sciprofiles.com/profile/94648', _.SciProfilesId('94648')]],
            [['https://sciprofiles.com/profile/118021', _.SciProfilesId('118021')]],
          ],
        },
      },
    )

    it.prop(
      'with a non-ID string',
      [fc.string()],
      ([string]) => {
        const actual = Schema.decodeUnknownEither(_.SciProfilesIdFromUrlSchema)(string)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
      {
        fastCheck: {
          examples: [
            ['https://sciprofiles.com/'],
            ['https://sciprofiles.com/user/publications/92927'],
            [' https://sciprofiles.com/profile/92927'],
            ['https://sciprofiles.com/profile/092927'],
          ],
        },
      },
    )

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = Schema.decodeUnknownEither(_.SciProfilesIdFromUrlSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  it.prop('encode', [fc.sciProfilesId()], ([sciProfilesId]) => {
    const actual = Schema.encodeSync(_.SciProfilesIdFromUrlSchema)(sciProfilesId)

    expect(actual).toStrictEqual(`https://sciprofiles.com/profile/${sciProfilesId}`)
  })
})
