import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as _ from '../src/cloudinary'
import * as fc from './fc'

describe('getAvatarFromCloudinary', () => {
  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.orcid(),
    fc.nonEmptyStringOf(fc.alphanumeric()),
  ])('when the ORCID iD has an avatar', async (cloudinaryApi, orcid, imageId) => {
    const getCloudinaryAvatar = jest.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.right(imageId))

    const actual = await _.getAvatarFromCloudinary(orcid)({
      cloudinaryApi,
      getCloudinaryAvatar,
    })()

    expect(actual).toStrictEqual(
      E.right(
        new URL(
          `https://res.cloudinary.com/${cloudinaryApi.cloudName}/image/upload/c_thumb,f_auto,g_face,h_300,q_auto,w_300,z_0.666/${imageId}`,
        ),
      ),
    )
    expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
  })

  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.orcid(),
  ])("when the ORCID iD doesn't have an avatar", async (cloudinaryApi, orcid) => {
    const actual = await _.getAvatarFromCloudinary(orcid)({
      cloudinaryApi,
      getCloudinaryAvatar: () => TE.left('not-found'),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.orcid(),
  ])('when the avatar is unavailable', async (cloudinaryApi, orcid) => {
    const actual = await _.getAvatarFromCloudinary(orcid)({
      cloudinaryApi,
      getCloudinaryAvatar: () => TE.left('unavailable'),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
