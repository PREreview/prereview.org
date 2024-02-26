import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { FixedClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import { P, isMatching } from 'ts-pattern'
import * as _ from '../src/cloudinary'
import * as fc from './fc'
import { shouldNotBeCalled } from './should-not-be-called'

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

describe('saveAvatarOnCloudinary', () => {
  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.origin(),
    fc.orcid(),
    fc.record({
      buffer: fc.string().map(string => Buffer.from(string)),
      mimetype: fc.constant('image/jpeg' as const),
    }),
    fc.nonEmptyStringOf(fc.alphanumeric()),
  ])('when the avatar can be saved', async (date, cloudinaryApi, publicUrl, orcid, avatar, imageId) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: `https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`,
        headers: { 'Content-Type': MediaType.applicationFormURLEncoded },
        matcher: (url, request) =>
          isMatching(
            {
              api_key: cloudinaryApi.key,
              context: `orcid_id=${orcid}|instance=${publicUrl.hostname}`,
              file: `data:${avatar.mimetype};base64,${avatar.buffer.toString('base64')}`,
              folder: 'prereview-profile',
              signature: P.string,
              timestamp: Math.round(date.getTime() / 1000).toString(),
            },
            Object.fromEntries(new URLSearchParams(request.body?.toString()).entries()),
          ),
      },
      { status: Status.OK, body: { public_id: `prereview-profile/${imageId}` } },
    )
    const saveCloudinaryAvatar = jest.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ => TE.right(undefined))

    const actual = await _.saveAvatarOnCloudinary(
      orcid,
      avatar,
    )({
      clock: FixedClock(date),
      cloudinaryApi,
      fetch,
      publicUrl,
      saveCloudinaryAvatar,
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
  })

  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.origin(),
    fc.orcid(),
    fc.record({
      buffer: fc.string().map(string => Buffer.from(string)),
      mimetype: fc.constant('image/jpeg' as const),
    }),
    fc.nonEmptyStringOf(fc.alphanumeric()),
  ])('when the avatar cannot be saved locally', async (date, cloudinaryApi, publicUrl, orcid, avatar, imageId) => {
    const fetch = fetchMock
      .sandbox()
      .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`, {
        status: Status.OK,
        body: { public_id: `prereview-profile/${imageId}` },
      })
    const saveCloudinaryAvatar = jest.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ => TE.left('unavailable'))

    const actual = await _.saveAvatarOnCloudinary(
      orcid,
      avatar,
    )({
      clock: FixedClock(date),
      cloudinaryApi,
      fetch,
      publicUrl,
      saveCloudinaryAvatar,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
  })

  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    }),
    fc.origin(),
    fc.orcid(),
    fc.record({
      buffer: fc.string().map(string => Buffer.from(string)),
      mimetype: fc.constant('image/jpeg' as const),
    }),
    fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
  ])(
    'when the avatar cannot be saved on Cloudinary',
    async (date, cloudinaryApi, publicUrl, orcid, avatar, response) => {
      const fetch = fetchMock
        .sandbox()
        .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`, response)

      const actual = await _.saveAvatarOnCloudinary(
        orcid,
        avatar,
      )({
        clock: FixedClock(date),
        cloudinaryApi,
        fetch,
        publicUrl,
        saveCloudinaryAvatar: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )
})
