import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import * as _ from '../src/cloudinary'
import * as fc from './fc'

describe('getAvatarFromCloudinary', () => {
  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.constantFrom('0000-0002-6109-0367' as Orcid, '0000-0003-4921-6155' as Orcid),
  ])('when the ORCID iD has an avatar', async (cloudinaryApi, orcid) => {
    const actual = await _.getAvatarFromCloudinary(orcid)({ cloudinaryApi })()

    expect(pipe(actual, E.map(String))).toStrictEqual(
      E.right(
        expect.stringMatching(
          `https://res.cloudinary.com/${cloudinaryApi.cloudName}/image/upload/c_thumb,f_auto,g_face,h_300,q_auto,w_300,z_0.666/`,
        ),
      ),
    )
  })

  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.orcid().filter(orcid => orcid !== '0000-0002-6109-0367' && orcid !== '0000-0003-4921-6155'),
  ])("when the ORCID iD doesn't have an avatar", async (cloudinaryApi, orcid) => {
    const actual = await _.getAvatarFromCloudinary(orcid)({ cloudinaryApi })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })
})
