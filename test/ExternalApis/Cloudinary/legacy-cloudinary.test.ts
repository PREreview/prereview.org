import { it } from '@effect/vitest'
import { FixedClock } from 'clock-ts'
import { Effect } from 'effect'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Readable } from 'stream'
import { P, isMatching } from 'ts-pattern'
import { describe, expect, vi } from 'vitest'
import * as _ from '../../../src/ExternalApis/Cloudinary/legacy-cloudinary.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('getAvatarFromCloudinary', () => {
  it.effect.prop(
    'when the ORCID iD has an avatar',
    [
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.orcidId(),
      fc.nonEmptyStringOf(fc.alphanumeric()),
    ],
    ([cloudinaryApi, orcid, imageId]) =>
      Effect.gen(function* () {
        const getCloudinaryAvatar = vi.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.right(imageId))

        const actual = yield* Effect.promise(
          _.getAvatarFromCloudinary(orcid)({
            cloudinaryApi,
            getCloudinaryAvatar,
          }),
        )

        expect(actual).toStrictEqual(
          E.right(
            new URL(
              `https://res.cloudinary.com/${cloudinaryApi.cloudName}/image/upload/c_thumb,f_auto,g_face,h_300,q_auto,w_300,z_0.666/prereview-profile/${imageId}`,
            ),
          ),
        )
        expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
      }),
  )

  it.effect.prop(
    "when the ORCID iD doesn't have an avatar",
    [
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.orcidId(),
    ],
    ([cloudinaryApi, orcid]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.getAvatarFromCloudinary(orcid)({
            cloudinaryApi,
            getCloudinaryAvatar: () => TE.left('not-found'),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop(
    'when the avatar is unavailable',
    [
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.orcidId(),
    ],
    ([cloudinaryApi, orcid]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.getAvatarFromCloudinary(orcid)({
            cloudinaryApi,
            getCloudinaryAvatar: () => TE.left('unavailable'),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('saveAvatarOnCloudinary', () => {
  describe("when there isn't an avatar already", () => {
    it.effect.prop(
      'when the avatar can be saved',
      [
        fc.date(),
        fc.record({
          cloudName: fc.lorem({ maxCount: 1 }),
          key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
          secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        }),
        fc.origin(),
        fc.orcidId(),
        fc.record({
          buffer: fc.string().map(string => Buffer.from(string)),
          mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
          path: fc.constant('/'),
        }),
        fc.nonEmptyStringOf(fc.alphanumeric()),
      ],
      ([date, cloudinaryApi, publicUrl, orcid, avatar, imageId]) =>
        Effect.gen(function* () {
          const fetch = fetchMock.createInstance().postOnce({
            url: `https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            matcherFunction: ({ options }) =>
              isMatching(
                {
                  api_key: cloudinaryApi.key,
                  context: `orcid_id=${orcid}|instance=${publicUrl.hostname}`,
                  file: `data:${avatar.mimetype};base64,${avatar.buffer.toString('base64')}`,
                  folder: 'prereview-profile',
                  signature: P.string,
                  timestamp: Math.round(date.getTime() / 1000).toString(),
                },
                Object.fromEntries(new URLSearchParams(options.body?.toString()).entries()),
              ),
            response: { status: StatusCodes.OK, body: { public_id: `prereview-profile/${imageId}` } },
          })
          const getCloudinaryAvatar = vi.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.left('not-found'))
          const saveCloudinaryAvatar = vi.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ =>
            TE.right(undefined),
          )

          const actual = yield* Effect.promise(
            _.saveAvatarOnCloudinary(
              orcid,
              avatar,
            )({
              clock: FixedClock(date),
              cloudinaryApi,
              fetch: (...args) => fetch.fetchHandler(...args),
              getCloudinaryAvatar,
              logger: () => IO.of(undefined),
              publicUrl,
              readFile: () => Readable.from(avatar.buffer),
              saveCloudinaryAvatar,
            }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
          expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
        }),
    )
  })

  describe('when there is an avatar already', () => {
    it.effect.prop(
      'when the avatar can be saved',
      [
        fc.date(),
        fc.record({
          cloudName: fc.lorem({ maxCount: 1 }),
          key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
          secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        }),
        fc.origin(),
        fc.orcidId(),
        fc.nonEmptyString(),
        fc.record({
          buffer: fc.string().map(string => Buffer.from(string)),
          mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
          path: fc.string(),
        }),
        fc.nonEmptyStringOf(fc.alphanumeric()),
      ],
      ([date, cloudinaryApi, publicUrl, orcid, existing, avatar, imageId]) =>
        Effect.gen(function* () {
          const fetch = fetchMock
            .createInstance()
            .postOnce({
              url: `https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              matcherFunction: ({ options }) =>
                isMatching(
                  {
                    api_key: cloudinaryApi.key,
                    context: `orcid_id=${orcid}|instance=${publicUrl.hostname}`,
                    file: `data:${avatar.mimetype};base64,${avatar.buffer.toString('base64')}`,
                    folder: 'prereview-profile',
                    signature: P.string,
                    timestamp: Math.round(date.getTime() / 1000).toString(),
                  },
                  Object.fromEntries(new URLSearchParams(options.body?.toString()).entries()),
                ),
              response: { status: StatusCodes.OK, body: { public_id: `prereview-profile/${imageId}` } },
            })
            .postOnce({
              url: `https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/destroy`,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              matcherFunction: ({ options }) =>
                isMatching(
                  {
                    api_key: cloudinaryApi.key,
                    public_id: `prereview-profile/${existing}`,
                    signature: P.string,
                    timestamp: Math.round(date.getTime() / 1000).toString(),
                  },
                  Object.fromEntries(new URLSearchParams(options.body?.toString()).entries()),
                ),
              response: { status: StatusCodes.OK, body: { result: 'ok' } },
            })
          const getCloudinaryAvatar = vi.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.right(existing))
          const saveCloudinaryAvatar = vi.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ =>
            TE.right(undefined),
          )

          const actual = yield* Effect.promise(
            _.saveAvatarOnCloudinary(
              orcid,
              avatar,
            )({
              clock: FixedClock(date),
              cloudinaryApi,
              fetch: (...args) => fetch.fetchHandler(...args),
              getCloudinaryAvatar,
              logger: () => IO.of(undefined),
              publicUrl,
              readFile: () => Readable.from(avatar.buffer),
              saveCloudinaryAvatar,
            }),
          )

          yield* Effect.promise(() => new Promise(r => setTimeout(r, 10)))

          expect(actual).toStrictEqual(E.right(undefined))
          expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
          expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when the existing avatar cannot be removed from Cloudinary',
      [
        fc.date(),
        fc.record({
          cloudName: fc.lorem({ maxCount: 1 }),
          key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
          secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        }),
        fc.origin(),
        fc.orcidId(),
        fc.nonEmptyString(),
        fc.record({
          buffer: fc.string().map(string => Buffer.from(string)),
          mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
          path: fc.string(),
        }),
        fc.nonEmptyStringOf(fc.alphanumeric()),
        fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
      ],
      ([date, cloudinaryApi, publicUrl, orcid, existing, avatar, imageId, response]) =>
        Effect.gen(function* () {
          const fetch = fetchMock
            .createInstance()
            .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`, {
              status: StatusCodes.OK,
              body: { public_id: `prereview-profile/${imageId}` },
            })
            .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/destroy`, response)
          const getCloudinaryAvatar = vi.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.right(existing))
          const saveCloudinaryAvatar = vi.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ =>
            TE.right(undefined),
          )

          const actual = yield* Effect.promise(
            _.saveAvatarOnCloudinary(
              orcid,
              avatar,
            )({
              clock: FixedClock(date),
              cloudinaryApi,
              fetch: (...args) => fetch.fetchHandler(...args),
              getCloudinaryAvatar,
              logger: () => IO.of(undefined),
              publicUrl,
              readFile: () => Readable.from(avatar.buffer),
              saveCloudinaryAvatar,
            }),
          )

          yield* Effect.promise(() => new Promise(r => setTimeout(r, 10)))

          expect(actual).toStrictEqual(E.right(undefined))
          expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
          expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )
  })

  it.effect.prop(
    'when the avatar cannot be saved locally',
    [
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.origin(),
      fc.orcidId(),
      fc.either(fc.constant('not-found'), fc.nonEmptyString()),
      fc.record({
        buffer: fc.string().map(string => Buffer.from(string)),
        mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
        path: fc.string(),
      }),
      fc.nonEmptyStringOf(fc.alphanumeric()),
    ],
    ([date, cloudinaryApi, publicUrl, orcid, existing, avatar, imageId]) =>
      Effect.gen(function* () {
        const fetch = fetchMock
          .createInstance()
          .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`, {
            status: StatusCodes.OK,
            body: { public_id: `prereview-profile/${imageId}` },
          })
        const saveCloudinaryAvatar = vi.fn<_.SaveCloudinaryAvatarEnv['saveCloudinaryAvatar']>(_ =>
          TE.left('unavailable'),
        )

        const actual = yield* Effect.promise(
          _.saveAvatarOnCloudinary(
            orcid,
            avatar,
          )({
            clock: FixedClock(date),
            cloudinaryApi,
            fetch: (...args) => fetch.fetchHandler(...args),
            getCloudinaryAvatar: () => TE.fromEither(existing),
            logger: () => IO.of(undefined),
            publicUrl,
            readFile: () => Readable.from(avatar.buffer),
            saveCloudinaryAvatar,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(saveCloudinaryAvatar).toHaveBeenCalledWith(orcid, imageId)
      }),
  )

  it.effect.prop(
    'when the avatar cannot be saved on Cloudinary',
    [
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.origin(),
      fc.orcidId(),
      fc.either(fc.constant('not-found'), fc.nonEmptyString()),
      fc.record({
        buffer: fc.string().map(string => Buffer.from(string)),
        mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
        path: fc.string(),
      }),
      fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
    ],
    ([date, cloudinaryApi, publicUrl, orcid, existing, avatar, response]) =>
      Effect.gen(function* () {
        const fetch = fetchMock
          .createInstance()
          .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`, response)

        const actual = yield* Effect.promise(
          _.saveAvatarOnCloudinary(
            orcid,
            avatar,
          )({
            clock: FixedClock(date),
            cloudinaryApi,
            fetch: (...args) => fetch.fetchHandler(...args),
            getCloudinaryAvatar: () => TE.fromEither(existing),
            logger: () => IO.of(undefined),
            publicUrl,
            readFile: () => Readable.from(avatar.buffer),
            saveCloudinaryAvatar: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'when the avatar cannot be loaded',
    [
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.origin(),
      fc.orcidId(),
      fc.either(fc.constant('not-found'), fc.nonEmptyString()),
      fc.record({
        mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
        path: fc.string(),
      }),
      fc.error(),
      fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
    ],
    ([date, cloudinaryApi, publicUrl, orcid, existing, avatar, error]) =>
      Effect.gen(function* () {
        const stream = new Readable()
        stream.destroy(error)

        const actual = yield* Effect.promise(
          _.saveAvatarOnCloudinary(
            orcid,
            avatar,
          )({
            clock: FixedClock(date),
            cloudinaryApi,
            fetch: shouldNotBeCalled,
            getCloudinaryAvatar: () => TE.fromEither(existing),
            logger: () => IO.of(undefined),
            publicUrl,
            readFile: () => stream,
            saveCloudinaryAvatar: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('removeAvatarFromCloudinary', () => {
  it.effect.prop(
    'when the avatar can be removed',
    [
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.orcidId(),
      fc.nonEmptyString(),
    ],
    ([date, cloudinaryApi, orcid, avatar]) =>
      Effect.gen(function* () {
        const deleteCloudinaryAvatar = vi.fn<_.DeleteCloudinaryAvatarEnv['deleteCloudinaryAvatar']>(_ =>
          TE.right(undefined),
        )
        const fetch = fetchMock.createInstance().postOnce({
          url: `https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/destroy`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          matcherFunction: ({ options }) =>
            isMatching(
              {
                api_key: cloudinaryApi.key,
                public_id: `prereview-profile/${avatar}`,
                signature: P.string,
                timestamp: Math.round(date.getTime() / 1000).toString(),
              },
              Object.fromEntries(new URLSearchParams(options.body?.toString()).entries()),
            ),
          response: { status: StatusCodes.OK, body: { result: 'ok' } },
        })

        const actual = yield* Effect.promise(
          _.removeAvatarFromCloudinary(orcid)({
            clock: FixedClock(date),
            cloudinaryApi,
            deleteCloudinaryAvatar,
            fetch: (...args) => fetch.fetchHandler(...args),
            getCloudinaryAvatar: () => TE.right(avatar),
            logger: () => IO.of(undefined),
          }),
        )

        yield* Effect.promise(() => new Promise(r => setTimeout(r, 10)))

        expect(actual).toStrictEqual(E.right(undefined))
        expect(deleteCloudinaryAvatar).toHaveBeenCalledWith(orcid)
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'when the avatar cannot be removed from Cloudinary',
    [
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.orcidId(),
      fc.nonEmptyString(),
      fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
    ],
    ([date, cloudinaryApi, orcid, avatar, response]) =>
      Effect.gen(function* () {
        const deleteCloudinaryAvatar = vi.fn<_.DeleteCloudinaryAvatarEnv['deleteCloudinaryAvatar']>(_ =>
          TE.right(undefined),
        )
        const fetch = fetchMock
          .createInstance()
          .postOnce(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/destroy`, response)

        const actual = yield* Effect.promise(
          _.removeAvatarFromCloudinary(orcid)({
            clock: FixedClock(date),
            cloudinaryApi,
            deleteCloudinaryAvatar,
            fetch: (...args) => fetch.fetchHandler(...args),
            getCloudinaryAvatar: () => TE.right(avatar),
            logger: () => IO.of(undefined),
          }),
        )

        yield* Effect.promise(() => new Promise(r => setTimeout(r, 10)))

        expect(actual).toStrictEqual(E.right(undefined))
        expect(deleteCloudinaryAvatar).toHaveBeenCalledWith(orcid)
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'when the avatar cannot be removed locally',
    [
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.orcidId(),
      fc.nonEmptyString(),
    ],
    ([date, cloudinaryApi, orcid, avatar]) =>
      Effect.gen(function* () {
        const deleteCloudinaryAvatar = vi.fn<_.DeleteCloudinaryAvatarEnv['deleteCloudinaryAvatar']>(_ =>
          TE.left('unavailable'),
        )

        const actual = yield* Effect.promise(
          _.removeAvatarFromCloudinary(orcid)({
            clock: FixedClock(date),
            cloudinaryApi,
            deleteCloudinaryAvatar,
            fetch: shouldNotBeCalled,
            getCloudinaryAvatar: () => TE.right(avatar),
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(deleteCloudinaryAvatar).toHaveBeenCalledWith(orcid)
      }),
  )

  it.effect.prop(
    'when the avatar cannot be loaded locally',
    [
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.orcidId(),
    ],
    ([date, cloudinaryApi, orcid]) =>
      Effect.gen(function* () {
        const getCloudinaryAvatar = vi.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.left('unavailable'))

        const actual = yield* Effect.promise(
          _.removeAvatarFromCloudinary(orcid)({
            clock: FixedClock(date),
            cloudinaryApi,
            deleteCloudinaryAvatar: shouldNotBeCalled,
            fetch: shouldNotBeCalled,
            getCloudinaryAvatar,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
      }),
  )

  it.effect.prop(
    'when there is no avatar',
    [
      fc.date(),
      fc.record({
        cloudName: fc.lorem({ maxCount: 1 }),
        key: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
        secret: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
      }),
      fc.orcidId(),
    ],
    ([date, cloudinaryApi, orcid]) =>
      Effect.gen(function* () {
        const getCloudinaryAvatar = vi.fn<_.GetCloudinaryAvatarEnv['getCloudinaryAvatar']>(_ => TE.left('not-found'))

        const actual = yield* Effect.promise(
          _.removeAvatarFromCloudinary(orcid)({
            clock: FixedClock(date),
            cloudinaryApi,
            deleteCloudinaryAvatar: shouldNotBeCalled,
            fetch: shouldNotBeCalled,
            getCloudinaryAvatar,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(getCloudinaryAvatar).toHaveBeenCalledWith(orcid)
      }),
  )
})
