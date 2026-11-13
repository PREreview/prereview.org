import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Layer, Option, pipe } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../../src/Context.ts'
import { CloudinaryAvatars } from '../../../../src/ExternalInteractions/index.ts'
import { Avatars } from '../../../../src/Domain/Prereviewers/index.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/MyDetails/RemoveAvatarPage/index.ts'
import * as fc from '../../../fc.ts'
import { shouldNotBeCalled } from '../../../should-not-be-called.ts'

const unavailable = (method: string) =>
  Effect.fail(new KeyValueStore.KeyValueStoreError({ message: 'unavailable', method }))

const storeWith = (overrides: Partial<Pick<Parameters<typeof KeyValueStore.makeStringOnly>[0], 'get' | 'remove'>>) =>
  Layer.provide(
    Avatars.layerKeyValueStore,
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

const havingProblems = {
  _tag: 'PageResponse',
  status: StatusCodes.ServiceUnavailable,
  title: expect.anything(),
  main: expect.anything(),
  skipToLabel: 'main',
  js: [],
}

const backToMyDetails = {
  _tag: 'RedirectResponse',
  status: StatusCodes.SeeOther,
  location: format(Routes.myDetailsMatch.formatter, {}),
}

describe('RemoveAvatarPage', () => {
  it.effect.prop(
    'when there is an avatar',
    [fc.supportedLocale(), fc.user(), fc.nonEmptyString(), fc.url()],
    ([locale, user, avatarId, url]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          Avatars.Store.use(store => store.set(user.orcid, avatarId)),
          Effect.andThen(_.RemoveAvatarPage),
          Effect.provide([
            Avatars.layerInMemory,
            Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { avatarUrl: () => Effect.succeed(url) }),
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.RemoveAvatar,
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }),
  )

  it.effect.prop('when there is no avatar', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.RemoveAvatarPage,
        Effect.provide([
          Avatars.layerInMemory,
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { avatarUrl: shouldNotBeCalled }),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(backToMyDetails)
    }),
  )

  it.effect.prop("when the avatar can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.RemoveAvatarPage,
        Effect.provide([
          storeWith({}),
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { avatarUrl: shouldNotBeCalled }),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})

describe('RemoveAvatarSubmission', () => {
  it.effect.prop(
    'when the avatar can be removed',
    [fc.supportedLocale(), fc.user(), fc.nonEmptyString(), fc.url()],
    ([locale, user, avatarId, url]) =>
      Effect.gen(function* () {
        const { response, stored } = yield* pipe(
          Effect.gen(function* () {
            yield* Avatars.Store.use(store => store.set(user.orcid, avatarId))

            const response = yield* _.RemoveAvatarSubmission

            return { response, stored: yield* Avatars.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            Avatars.layerInMemory,
            Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
              avatarUrl: () => Effect.succeed(url),
              destroyAvatar: () => Effect.void,
            }),
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(response).toStrictEqual({
          _tag: 'FlashMessageResponse',
          location: format(Routes.myDetailsMatch.formatter, {}),
          message: 'avatar-removed',
        })
        expect(stored).toStrictEqual(Option.none())
      }),
  )

  it.effect.prop(
    "when the avatar can't be removed",
    [fc.supportedLocale(), fc.user(), fc.nonEmptyString(), fc.url()],
    ([locale, user, avatarId, url]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.RemoveAvatarSubmission,
          Effect.provide([
            storeWith({ get: () => Effect.succeed(JSON.stringify(avatarId)) }),
            Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
              avatarUrl: () => Effect.succeed(url),
              destroyAvatar: shouldNotBeCalled,
            }),
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(actual).toStrictEqual(havingProblems)
      }),
  )

  it.effect.prop('when there is no avatar', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.RemoveAvatarSubmission,
        Effect.provide([
          Avatars.layerInMemory,
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
            avatarUrl: shouldNotBeCalled,
            destroyAvatar: shouldNotBeCalled,
          }),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(backToMyDetails)
    }),
  )

  it.effect.prop("when the avatar can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.RemoveAvatarSubmission,
        Effect.provide([
          storeWith({}),
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
            avatarUrl: shouldNotBeCalled,
            destroyAvatar: shouldNotBeCalled,
          }),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})
