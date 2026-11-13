import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Layer, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../../src/Context.ts'
import { IsOpenForRequestsStore } from '../../../../src/Domain/Prereviewers/index.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import type { SupportedLocale } from '../../../../src/locales/index.ts'
import { LoggedInUser, type User } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/MyDetails/OpenForRequestsPage/index.ts'
import * as fc from '../../../fc.ts'
import { keyValueStoreWith } from '../KeyValueStores.ts'

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

const context = (locale: SupportedLocale, user: User) =>
  [Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)] as const

const formPage = {
  _tag: 'PageResponse',
  canonical: Routes.ChangeOpenForRequests,
  status: StatusCodes.OK,
  title: expect.anything(),
  nav: expect.anything(),
  main: expect.anything(),
  skipToLabel: 'form',
  js: [],
}

const invalidPage = {
  _tag: 'PageResponse',
  canonical: Routes.ChangeOpenForRequests,
  status: StatusCodes.BadRequest,
  title: expect.anything(),
  nav: expect.anything(),
  main: expect.anything(),
  skipToLabel: 'form',
  js: ['error-summary.js'],
}

describe('OpenForRequestsPage', () => {
  it.effect.prop(
    'when there is a value',
    [fc.supportedLocale(), fc.user(), fc.isOpenForRequests()],
    ([locale, user, value]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          Effect.flatMap(
            IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, value)),
            () => _.OpenForRequestsPage,
          ),
          Effect.provide([IsOpenForRequestsStore.layerInMemory, ...context(locale, user)]),
        )

        expect(actual).toStrictEqual(formPage)
      }),
  )

  it.effect.prop('when there is no value', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OpenForRequestsPage,
        Effect.provide([IsOpenForRequestsStore.layerInMemory, ...context(locale, user)]),
      )

      expect(actual).toStrictEqual(formPage)
    }),
  )

  it.effect.prop("when the value can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OpenForRequestsPage,
        Effect.provide([
          Layer.provide(IsOpenForRequestsStore.layerKeyValueStore, keyValueStoreWith({})),
          ...context(locale, user),
        ]),
      )

      expect(actual).toStrictEqual(formPage)
    }),
  )
})

describe('OpenForRequestsSubmission', () => {
  it.effect.prop(
    'when they say yes and are already open',
    [fc.supportedLocale(), fc.user(), fc.isOpenForRequestsVisibility()],
    ([locale, user, visibility]) =>
      Effect.gen(function* () {
        const existing = { value: true as const, visibility }
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, existing))

            const response = yield* _.OpenForRequestsSubmission(UrlParams.fromInput({ openForRequests: 'yes' }))

            return { response, saved: yield* IsOpenForRequestsStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([IsOpenForRequestsStore.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.some(existing))
      }),
  )

  it.effect.prop('when they say yes and were not open', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const existing = { value: false as const }
      const { response, saved } = yield* pipe(
        Effect.gen(function* () {
          yield* IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, existing))

          const response = yield* _.OpenForRequestsSubmission(UrlParams.fromInput({ openForRequests: 'yes' }))

          return { response, saved: yield* IsOpenForRequestsStore.Store.use(store => store.get(user.orcid)) }
        }),
        Effect.provide([IsOpenForRequestsStore.layerInMemory, ...context(locale, user)]),
      )

      expect(response).toStrictEqual(backToMyDetails)
      expect(saved).toStrictEqual(Option.some({ value: true, visibility: 'restricted' }))
    }),
  )

  it.effect.prop("when they say yes and haven't answered before", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const { response, saved } = yield* pipe(
        Effect.gen(function* () {
          const response = yield* _.OpenForRequestsSubmission(UrlParams.fromInput({ openForRequests: 'yes' }))

          return { response, saved: yield* IsOpenForRequestsStore.Store.use(store => store.get(user.orcid)) }
        }),
        Effect.provide([IsOpenForRequestsStore.layerInMemory, ...context(locale, user)]),
      )

      expect(response).toStrictEqual(backToMyDetails)
      expect(saved).toStrictEqual(Option.some({ value: true, visibility: 'restricted' }))
    }),
  )

  it.effect.prop(
    'when they say no',
    [fc.supportedLocale(), fc.user(), fc.isOpenForRequests()],
    ([locale, user, existing]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, existing))

            const response = yield* _.OpenForRequestsSubmission(UrlParams.fromInput({ openForRequests: 'no' }))

            return { response, saved: yield* IsOpenForRequestsStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([IsOpenForRequestsStore.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.some({ value: false }))
      }),
  )

  it.effect.prop(
    'when the form is invalid',
    [fc.supportedLocale(), fc.user(), fc.isOpenForRequests()],
    ([locale, user, existing]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* IsOpenForRequestsStore.Store.use(store => store.set(user.orcid, existing))

            const response = yield* _.OpenForRequestsSubmission(UrlParams.empty)

            return { response, saved: yield* IsOpenForRequestsStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([IsOpenForRequestsStore.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(invalidPage)
        expect(saved).toStrictEqual(Option.some(existing))
      }),
  )

  it.effect.prop("when it can't be saved", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OpenForRequestsSubmission(UrlParams.fromInput({ openForRequests: 'no' })),
        Effect.provide([
          Layer.provide(IsOpenForRequestsStore.layerKeyValueStore, keyValueStoreWith({})),
          ...context(locale, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )

  it.effect.prop("when the existing answer can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.OpenForRequestsSubmission(UrlParams.fromInput({ openForRequests: 'yes' })),
        Effect.provide([
          Layer.provide(IsOpenForRequestsStore.layerKeyValueStore, keyValueStoreWith({})),
          ...context(locale, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})
