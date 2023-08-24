import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import type { Orcid } from 'orcid-id-ts'
import * as _ from '../src/cloudinary'
import * as fc from './fc'

describe('getAvatarFromCloudinary', () => {
  test('when the ORCID iD is 0000-0003-4921-6155', async () => {
    const actual = await _.getAvatarFromCloudinary('0000-0003-4921-6155' as Orcid)()

    expect(actual).toStrictEqual(
      E.right(
        new URL(
          'https://res.cloudinary.com/prereview/image/upload/c_thumb,f_auto,g_face,h_300,q_auto,w_300,z_0.666/prereview-profile/dvyalmcsaz6bwri1iux4',
        ),
      ),
    )
  })

  test.prop([fc.orcid().filter(orcid => orcid !== '0000-0003-4921-6155')])(
    'when the ORCID iD is not 0000-0003-4921-6155',
    async orcid => {
      const actual = await _.getAvatarFromCloudinary(orcid)()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )
})
