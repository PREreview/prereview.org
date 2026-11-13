import { describe, expect, it, vi } from '../../vitest.ts'
import { Deferred, Effect, Layer, Option, pipe } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { CloudinaryAvatars } from '../../../src/ExternalInteractions/index.ts'
import * as _ from '../../../src/Domain/Prereviewers/Avatars.ts'
import type { NonEmptyString, OrcidId } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

const unavailable = (method: string) =>
  Effect.fail(new KeyValueStore.KeyValueStoreError({ message: 'unavailable', method }))

const storeWith = (
  overrides: Partial<Pick<Parameters<typeof KeyValueStore.makeStringOnly>[0], 'get' | 'set' | 'remove'>>,
) =>
  Layer.provide(
    _.layerKeyValueStore,
    Layer.succeed(
      KeyValueStore.KeyValueStore,
      KeyValueStore.makeStringOnly({
        get: () => unavailable('get'),
        set: () => unavailable('set'),
        remove: () => unavailable('remove'),
        clear: unavailable('clear'),
        size: unavailable('size'),
        keys: unavailable('keys'),
        ...overrides,
      }),
    ),
  )

const avatarFile = (): fc.Arbitrary<CloudinaryAvatars.AvatarFile> =>
  fc.record({
    path: fc.string(),
    mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
  })

const seed = (orcid: OrcidId.OrcidId, avatarId: NonEmptyString.NonEmptyString) =>
  _.Store.use(store => store.set(orcid, avatarId))

const stored = (orcid: OrcidId.OrcidId) => _.Store.use(store => store.get(orcid))

describe('get', () => {
  it.effect.prop('when there is an avatar', [fc.orcidId(), fc.nonEmptyString(), fc.url()], ([orcid, avatarId, url]) =>
    Effect.gen(function* () {
      const avatarUrl = vi.fn<(typeof CloudinaryAvatars.CloudinaryAvatars.Service)['avatarUrl']>(() =>
        Effect.succeed(url),
      )

      const actual = yield* pipe(
        seed(orcid, avatarId),
        Effect.andThen(_.get(orcid)),
        Effect.provide([_.layerInMemory, Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { avatarUrl })]),
      )

      expect(actual).toStrictEqual(url)
      expect(avatarUrl).toHaveBeenCalledExactlyOnceWith(avatarId)
    }),
  )

  it.effect.prop(
    'when there is something other than an avatar',
    [fc.orcidId(), fc.json().filter(value => typeof value !== 'string')],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.get(orcid),
          Effect.provide([
            storeWith({ get: () => Effect.succeed(JSON.stringify(value)) }),
            Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { avatarUrl: shouldNotBeCalled }),
          ]),
          Effect.flip,
        )

        expect(actual._tag).toStrictEqual('AvatarNotFound')
      }),
  )

  it.effect.prop("when there isn't an avatar", [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.get(orcid),
        Effect.provide([
          _.layerInMemory,
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { avatarUrl: shouldNotBeCalled }),
        ]),
        Effect.flip,
      )

      expect(actual._tag).toStrictEqual('AvatarNotFound')
    }),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.get(orcid),
        Effect.provide([
          storeWith({}),
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { avatarUrl: shouldNotBeCalled }),
        ]),
        Effect.flip,
      )

      expect(actual._tag).toStrictEqual('AvatarUnavailable')
    }),
  )
})

describe('save', () => {
  describe("when there isn't an avatar already", () => {
    it.effect.prop(
      'when the avatar can be saved',
      [fc.orcidId(), avatarFile(), fc.nonEmptyString()],
      ([orcid, avatar, avatarId]) =>
        Effect.gen(function* () {
          const uploadAvatar = vi.fn<(typeof CloudinaryAvatars.CloudinaryAvatars.Service)['uploadAvatar']>(() =>
            Effect.succeed(avatarId),
          )

          const actual = yield* pipe(
            _.save(orcid, avatar),
            Effect.andThen(stored(orcid)),
            Effect.provide([
              _.layerInMemory,
              Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { uploadAvatar, destroyAvatar: shouldNotBeCalled }),
            ]),
          )

          expect(actual).toStrictEqual(Option.some(avatarId))
          expect(uploadAvatar).toHaveBeenCalledExactlyOnceWith(orcid, avatar)
        }),
    )
  })

  describe('when there is an avatar already', () => {
    it.effect.prop(
      'when the avatar can be saved',
      [fc.orcidId(), fc.nonEmptyString(), avatarFile(), fc.nonEmptyString()],
      ([orcid, existing, avatar, avatarId]) =>
        Effect.gen(function* () {
          const destroyed = yield* Deferred.make<NonEmptyString.NonEmptyString>()

          const actual = yield* pipe(
            seed(orcid, existing),
            Effect.andThen(_.save(orcid, avatar)),
            Effect.andThen(stored(orcid)),
            Effect.provide([
              _.layerInMemory,
              Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
                uploadAvatar: () => Effect.succeed(avatarId),
                destroyAvatar: id => Effect.asVoid(Deferred.succeed(destroyed, id)),
              }),
            ]),
          )

          expect(actual).toStrictEqual(Option.some(avatarId))
          expect(yield* Deferred.await(destroyed)).toStrictEqual(existing)
        }),
    )

    it.effect.prop(
      "when the existing image can't be destroyed",
      [fc.orcidId(), fc.nonEmptyString(), avatarFile(), fc.nonEmptyString()],
      ([orcid, existing, avatar, avatarId]) =>
        Effect.gen(function* () {
          const attempted = yield* Deferred.make<undefined>()

          const actual = yield* pipe(
            seed(orcid, existing),
            Effect.andThen(_.save(orcid, avatar)),
            Effect.andThen(stored(orcid)),
            Effect.provide([
              _.layerInMemory,
              Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
                uploadAvatar: () => Effect.succeed(avatarId),
                destroyAvatar: () =>
                  Effect.andThen(
                    Deferred.succeed(attempted, undefined),
                    Effect.fail(new CloudinaryAvatars.FailedToDestroyAvatar({})),
                  ),
              }),
            ]),
          )

          yield* Deferred.await(attempted)

          expect(actual).toStrictEqual(Option.some(avatarId))
        }),
    )
  })

  it.effect.prop(
    "when the avatar ID can't be stored",
    [fc.orcidId(), avatarFile(), fc.nonEmptyString()],
    ([orcid, avatar, avatarId]) =>
      Effect.gen(function* () {
        const set = vi.fn<NonNullable<Parameters<typeof storeWith>[0]['set']>>(() => unavailable('set'))

        const actual = yield* pipe(
          _.save(orcid, avatar),
          Effect.provide([
            storeWith({ get: () => Effect.undefined, set }),
            Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
              uploadAvatar: () => Effect.succeed(avatarId),
              destroyAvatar: shouldNotBeCalled,
            }),
          ]),
          Effect.flip,
        )

        expect(actual._tag).toStrictEqual('AvatarUnavailable')
        expect(set).toHaveBeenCalledExactlyOnceWith(orcid, JSON.stringify(avatarId))
      }),
  )

  it.effect.prop(
    "when the existing avatar can't be loaded",
    [fc.orcidId(), avatarFile(), fc.nonEmptyString()],
    ([orcid, avatar, avatarId]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.save(orcid, avatar),
          Effect.provide([
            storeWith({}),
            Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
              uploadAvatar: () => Effect.succeed(avatarId),
              destroyAvatar: shouldNotBeCalled,
            }),
          ]),
          Effect.flip,
        )

        expect(actual._tag).toStrictEqual('AvatarUnavailable')
      }),
  )

  it.effect.prop(
    "when the avatar can't be uploaded",
    [fc.orcidId(), fc.oneof(fc.constant(undefined), fc.nonEmptyString()), avatarFile()],
    ([orcid, existing, avatar]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          Effect.gen(function* () {
            if (existing !== undefined) {
              yield* seed(orcid, existing)
            }

            const result = yield* Effect.flip(_.save(orcid, avatar))

            return { result, stored: yield* stored(orcid) }
          }),
          Effect.provide([
            _.layerInMemory,
            Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
              uploadAvatar: () => Effect.fail(new CloudinaryAvatars.FailedToUploadAvatar({})),
              destroyAvatar: shouldNotBeCalled,
            }),
          ]),
        )

        expect(actual.result._tag).toStrictEqual('AvatarUnavailable')
        expect(actual.stored).toStrictEqual(existing === undefined ? Option.none() : Option.some(existing))
      }),
  )
})

describe('remove', () => {
  it.effect.prop('when the avatar can be removed', [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatarId]) =>
    Effect.gen(function* () {
      const destroyed = yield* Deferred.make<NonEmptyString.NonEmptyString>()

      const actual = yield* pipe(
        seed(orcid, avatarId),
        Effect.andThen(_.remove(orcid)),
        Effect.andThen(stored(orcid)),
        Effect.provide([
          _.layerInMemory,
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
            destroyAvatar: id => Effect.asVoid(Deferred.succeed(destroyed, id)),
          }),
        ]),
      )

      expect(actual).toStrictEqual(Option.none())
      expect(yield* Deferred.await(destroyed)).toStrictEqual(avatarId)
    }),
  )

  it.effect.prop("when the image can't be destroyed", [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatarId]) =>
    Effect.gen(function* () {
      const attempted = yield* Deferred.make<undefined>()

      const actual = yield* pipe(
        seed(orcid, avatarId),
        Effect.andThen(_.remove(orcid)),
        Effect.provide([
          _.layerInMemory,
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
            destroyAvatar: () =>
              Effect.andThen(
                Deferred.succeed(attempted, undefined),
                Effect.fail(new CloudinaryAvatars.FailedToDestroyAvatar({})),
              ),
          }),
        ]),
      )

      yield* Deferred.await(attempted)

      expect(actual).toStrictEqual(undefined)
    }),
  )

  it.effect.prop("when the avatar ID can't be removed", [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatarId]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.remove(orcid),
        Effect.provide([
          storeWith({ get: () => Effect.succeed(JSON.stringify(avatarId)) }),
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { destroyAvatar: shouldNotBeCalled }),
        ]),
        Effect.flip,
      )

      expect(actual._tag).toStrictEqual('AvatarUnavailable')
    }),
  )

  it.effect.prop("when the avatar ID can't be loaded", [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.remove(orcid),
        Effect.provide([
          storeWith({}),
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { destroyAvatar: shouldNotBeCalled }),
        ]),
        Effect.flip,
      )

      expect(actual._tag).toStrictEqual('AvatarUnavailable')
    }),
  )

  it.effect.prop('when there is no avatar', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.remove(orcid),
        Effect.provide([
          _.layerInMemory,
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { destroyAvatar: shouldNotBeCalled }),
        ]),
      )

      expect(actual).toStrictEqual(undefined)
    }),
  )
})
