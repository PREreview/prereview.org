import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Layer, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../../src/Context.ts'
import { IsOpenForRequestsStore } from '../../../../src/Prereviewers/index.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/MyDetails/OpenForRequestsVisibilityPage/index.ts'
import * as fc from '../../../fc.ts'
import { keyValueStoreWith } from '../KeyValueStores.ts'

const stored = () => fc.isOpenForRequestsVisibility().map(visibility => ({ value: true as const, visibility }))

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

describe('OpenForRequestsVisibilityPage', () => {
  it.effect.prop('when there is a value', [fc.supportedLocale(), fc.user(), stored()], ([locale, user, value]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        Effect.flatMap(
          IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, value)),
          () => _.OpenForRequestsVisibilityPage,
        ),
        Effect.provide([
          IsOpenForRequestsStore.layerInMemory,
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ChangeOpenForRequestsVisibility,
        status: StatusCodes.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: [],
      })
    }),
  )

  it.effect.prop("when they're not open for requests", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        Effect.flatMap(
          IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, { value: false })),
          () => _.OpenForRequestsVisibilityPage,
        ),
        Effect.provide([
          IsOpenForRequestsStore.layerInMemory,
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(backToMyDetails)
    }),
  )

  it.effect.prop('when there is no value', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OpenForRequestsVisibilityPage,
        Effect.provide([
          IsOpenForRequestsStore.layerInMemory,
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(backToMyDetails)
    }),
  )

  it.effect.prop("when the value can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OpenForRequestsVisibilityPage,
        Effect.provide([
          Layer.provide(IsOpenForRequestsStore.layerKeyValueStore, keyValueStoreWith({})),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})

describe('OpenForRequestsVisibilitySubmission', () => {
  it.effect.prop(
    'when the form has been submitted',
    [fc.supportedLocale(), fc.user(), stored(), fc.constantFrom('public' as const, 'restricted' as const)],
    ([locale, user, value, visibility]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, value))

            const response = yield* _.OpenForRequestsVisibilitySubmission(
              UrlParams.fromInput({ openForRequestsVisibility: visibility }),
            )

            return { response, saved: yield* IsOpenForRequestsStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            IsOpenForRequestsStore.layerInMemory,
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.some({ ...value, visibility }))
      }),
  )

  it.effect.prop(
    'when the form is invalid',
    [fc.supportedLocale(), fc.user(), stored(), fc.string().filter(value => value !== 'public')],
    ([locale, user, value, visibility]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, value))

            const response = yield* _.OpenForRequestsVisibilitySubmission(
              UrlParams.fromInput({ openForRequestsVisibility: visibility }),
            )

            return { response, saved: yield* IsOpenForRequestsStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            IsOpenForRequestsStore.layerInMemory,
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.some({ ...value, visibility: 'restricted' }))
      }),
  )

  it.effect.prop(
    "when they're not open for requests",
    [fc.supportedLocale(), fc.user(), fc.constantFrom('public', 'restricted')],
    ([locale, user, visibility]) =>
      Effect.gen(function* () {
        const { response, stored } = yield* pipe(
          Effect.gen(function* () {
            yield* IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, { value: false }))

            const response = yield* _.OpenForRequestsVisibilitySubmission(
              UrlParams.fromInput({ openForRequestsVisibility: visibility }),
            )

            return { response, stored: yield* IsOpenForRequestsStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            IsOpenForRequestsStore.layerInMemory,
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(stored).toStrictEqual(Option.some({ value: false }))
      }),
  )

  it.effect.prop(
    "when the change can't be saved",
    [fc.supportedLocale(), fc.user(), stored()],
    ([locale, user, value]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.OpenForRequestsVisibilitySubmission(UrlParams.empty),
          Effect.provide([
            Layer.provide(
              IsOpenForRequestsStore.layerKeyValueStore,
              keyValueStoreWith({ get: () => Effect.succeed(JSON.stringify(value)) }),
            ),
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(actual).toStrictEqual(havingProblems)
      }),
  )

  it.effect.prop('when there is no value', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OpenForRequestsVisibilitySubmission(UrlParams.empty),
        Effect.provide([
          IsOpenForRequestsStore.layerInMemory,
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(backToMyDetails)
    }),
  )

  it.effect.prop("when the value can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OpenForRequestsVisibilitySubmission(UrlParams.empty),
        Effect.provide([
          Layer.provide(IsOpenForRequestsStore.layerKeyValueStore, keyValueStoreWith({})),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})
