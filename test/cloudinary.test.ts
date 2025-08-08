import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { FixedClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { P, isMatching } from 'ts-pattern'
import * as _ from '../src/cloudinary.js'
import * as StatusCodes from '../src/StatusCodes.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

describe('getAvatarFromCloudinary', () => {
  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
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
          `https://res.cloudinary.com/${cloudinaryApi.cloudName}/image/upload/c_thumb,f_auto,g_face,h_300,q_auto,w_300,z_0.666/prereview-profile/${imageId}`,
        ),
      ),
    )
    expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
  })

  test.prop([
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
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
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
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
  describe("when there isn't an avatar already", () => {
    test.prop([
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.origin(),
      fc.orcid(),
      fc.record({
        buffer: fc.string().map(string => Buffer.from(string)),
        mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
      }),
      fc.nonEmptyStringOf(fc.alphanumeric()),
    ])('when the avatar can be saved', async (date, cloudinaryApi, publicUrl, orcid, avatar, imageId) => {
      const fetch = fetchMock.sandbox().postOnce(
        {
          url: `https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
        { status: StatusCodes.OK, body: { public_id: `prereview-profile/${imageId}` } },
      )
      const getCloudinaryAvatar = jest.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.left('not-found'))
      const saveCloudinaryAvatar = jest.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ => TE.right(undefined))

      const actual = await _.saveAvatarOnCloudinary(
        orcid,
        avatar,
      )({
        clock: FixedClock(date),
        cloudinaryApi,
        fetch,
        getCloudinaryAvatar,
        logger: () => IO.of(undefined),
        publicUrl,
        saveCloudinaryAvatar,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
      expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
    })
  })

  describe('when there is an avatar already', () => {
    test.prop([
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.origin(),
      fc.orcid(),
      fc.nonEmptyString(),
      fc.record({
        buffer: fc.string().map(string => Buffer.from(string)),
        mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
      }),
      fc.nonEmptyStringOf(fc.alphanumeric()),
    ])('when the avatar can be saved', async (date, cloudinaryApi, publicUrl, orcid, existing, avatar, imageId) => {
      const fetch = fetchMock
        .sandbox()
        .postOnce(
          {
            url: `https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
          { status: StatusCodes.OK, body: { public_id: `prereview-profile/${imageId}` } },
        )
        .postOnce(
          {
            url: `https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/destroy`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            matcher: (url, request) =>
              isMatching(
                {
                  api_key: cloudinaryApi.key,
                  public_id: `prereview-profile/${existing}`,
                  signature: P.string,
                  timestamp: Math.round(date.getTime() / 1000).toString(),
                },
                Object.fromEntries(new URLSearchParams(request.body?.toString()).entries()),
              ),
          },
          { status: StatusCodes.OK, body: { result: 'ok' } },
        )
      const getCloudinaryAvatar = jest.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.right(existing))
      const saveCloudinaryAvatar = jest.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ => TE.right(undefined))

      const actual = await _.saveAvatarOnCloudinary(
        orcid,
        avatar,
      )({
        clock: FixedClock(date),
        cloudinaryApi,
        fetch,
        getCloudinaryAvatar,
        logger: () => IO.of(undefined),
        publicUrl,
        saveCloudinaryAvatar,
      })()

      await new Promise(r => setTimeout(r, 10))

      expect(actual).toStrictEqual(E.right(undefined))
      expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
      expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
      expect(fetch.done()).toBeTruthy()
    })

    test.prop([
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.origin(),
      fc.orcid(),
      fc.nonEmptyString(),
      fc.record({
        buffer: fc.string().map(string => Buffer.from(string)),
        mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
      }),
      fc.nonEmptyStringOf(fc.alphanumeric()),
      fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
    ])(
      'when the existing avatar cannot be removed from Cloudinary',
      async (date, cloudinaryApi, publicUrl, orcid, existing, avatar, imageId, response) => {
        const fetch = fetchMock
          .sandbox()
          .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`, {
            status: StatusCodes.OK,
            body: { public_id: `prereview-profile/${imageId}` },
          })
          .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/destroy`, response)
        const getCloudinaryAvatar = jest.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.right(existing))
        const saveCloudinaryAvatar = jest.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ =>
          TE.right(undefined),
        )

        const actual = await _.saveAvatarOnCloudinary(
          orcid,
          avatar,
        )({
          clock: FixedClock(date),
          cloudinaryApi,
          fetch,
          getCloudinaryAvatar,
          logger: () => IO.of(undefined),
          publicUrl,
          saveCloudinaryAvatar,
        })()

        await new Promise(r => setTimeout(r, 10))

        expect(actual).toStrictEqual(E.right(undefined))
        expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
        expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
        expect(fetch.done()).toBeTruthy()
      },
    )
  })

  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    }),
    fc.origin(),
    fc.orcid(),
    fc.either(fc.constant('not-found'), fc.nonEmptyString()),
    fc.record({
      buffer: fc.string().map(string => Buffer.from(string)),
      mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
    }),
    fc.nonEmptyStringOf(fc.alphanumeric()),
  ])(
    'when the avatar cannot be saved locally',
    async (date, cloudinaryApi, publicUrl, orcid, existing, avatar, imageId) => {
      const fetch = fetchMock
        .sandbox()
        .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`, {
          status: StatusCodes.OK,
          body: { public_id: `prereview-profile/${imageId}` },
        })
      const saveCloudinaryAvatar = jest.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ =>
        TE.left('unavailable'),
      )

      const actual = await _.saveAvatarOnCloudinary(
        orcid,
        avatar,
      )({
        clock: FixedClock(date),
        cloudinaryApi,
        fetch,
        getCloudinaryAvatar: () => TE.fromEither(existing),
        logger: () => IO.of(undefined),
        publicUrl,
        saveCloudinaryAvatar,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
    },
  )

  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    }),
    fc.origin(),
    fc.orcid(),
    fc.either(fc.constant('not-found'), fc.nonEmptyString()),
    fc.record({
      buffer: fc.string().map(string => Buffer.from(string)),
      mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
    }),
    fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
  ])(
    'when the avatar cannot be saved on Cloudinary',
    async (date, cloudinaryApi, publicUrl, orcid, existing, avatar, response) => {
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
        getCloudinaryAvatar: () => TE.fromEither(existing),
        logger: () => IO.of(undefined),
        publicUrl,
        saveCloudinaryAvatar: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )
})

describe('removeAvatarFromCloudinary', () => {
  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    }),
    fc.orcid(),
    fc.nonEmptyString(),
  ])('when the avatar can be removed', async (date, cloudinaryApi, orcid, avatar) => {
    const deleteCloudinaryAvatar = jest.fn<_.DeleteCloudinaryAvatarEnv['deleteCloudinaryAvatar']>(_ =>
      TE.right(undefined),
    )
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: `https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/destroy`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        matcher: (url, request) =>
          isMatching(
            {
              api_key: cloudinaryApi.key,
              public_id: `prereview-profile/${avatar}`,
              signature: P.string,
              timestamp: Math.round(date.getTime() / 1000).toString(),
            },
            Object.fromEntries(new URLSearchParams(request.body?.toString()).entries()),
          ),
      },
      { status: StatusCodes.OK, body: { result: 'ok' } },
    )

    const actual = await _.removeAvatarFromCloudinary(orcid)({
      clock: FixedClock(date),
      cloudinaryApi,
      deleteCloudinaryAvatar,
      fetch,
      getCloudinaryAvatar: () => TE.right(avatar),
      logger: () => IO.of(undefined),
    })()

    await new Promise(r => setTimeout(r, 10))

    expect(actual).toStrictEqual(E.right(undefined))
    expect(deleteCloudinaryAvatar).toHaveBeenCalledWith(orcid)
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    }),
    fc.orcid(),
    fc.nonEmptyString(),
    fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
  ])('when the avatar cannot be removed from Cloudinary', async (date, cloudinaryApi, orcid, avatar, response) => {
    const deleteCloudinaryAvatar = jest.fn<_.DeleteCloudinaryAvatarEnv['deleteCloudinaryAvatar']>(_ =>
      TE.right(undefined),
    )
    const fetch = fetchMock
      .sandbox()
      .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/destroy`, response)

    const actual = await _.removeAvatarFromCloudinary(orcid)({
      clock: FixedClock(date),
      cloudinaryApi,
      deleteCloudinaryAvatar,
      fetch,
      getCloudinaryAvatar: () => TE.right(avatar),
      logger: () => IO.of(undefined),
    })()

    await new Promise(r => setTimeout(r, 10))

    expect(actual).toStrictEqual(E.right(undefined))
    expect(deleteCloudinaryAvatar).toHaveBeenCalledWith(orcid)
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    }),
    fc.orcid(),
    fc.nonEmptyString(),
  ])('when the avatar cannot be removed locally', async (date, cloudinaryApi, orcid, avatar) => {
    const deleteCloudinaryAvatar = jest.fn<_.DeleteCloudinaryAvatarEnv['deleteCloudinaryAvatar']>(_ =>
      TE.left('unavailable'),
    )

    const actual = await _.removeAvatarFromCloudinary(orcid)({
      clock: FixedClock(date),
      cloudinaryApi,
      deleteCloudinaryAvatar,
      fetch: shouldNotBeCalled,
      getCloudinaryAvatar: () => TE.right(avatar),
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(deleteCloudinaryAvatar).toHaveBeenCalledWith(orcid)
  })

  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    }),
    fc.orcid(),
  ])('when the avatar cannot be loaded locally', async (date, cloudinaryApi, orcid) => {
    const getCloudinaryAvatar = jest.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.left('unavailable'))

    const actual = await _.removeAvatarFromCloudinary(orcid)({
      clock: FixedClock(date),
      cloudinaryApi,
      deleteCloudinaryAvatar: shouldNotBeCalled,
      fetch: shouldNotBeCalled,
      getCloudinaryAvatar,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
  })

  test.prop([
    fc.date(),
    fc.record({
      cloudName: fc.lorem({ maxCount: 1 }),
      key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    }),
    fc.orcid(),
  ])('when there is no avatar', async (date, cloudinaryApi, orcid) => {
    const getCloudinaryAvatar = jest.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.left('not-found'))

    const actual = await _.removeAvatarFromCloudinary(orcid)({
      clock: FixedClock(date),
      cloudinaryApi,
      deleteCloudinaryAvatar: shouldNotBeCalled,
      fetch: shouldNotBeCalled,
      getCloudinaryAvatar,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
  })
})
