import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Layer, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../../src/Context.ts'
import { LanguagesStore } from '../../../../src/Domain/Prereviewers/index.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import type { SupportedLocale } from '../../../../src/locales/index.ts'
import { LoggedInUser, type User } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/MyDetails/LanguagesPage/index.ts'
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
  canonical: Routes.ChangeLanguages,
  status: StatusCodes.OK,
  title: expect.anything(),
  nav: expect.anything(),
  main: expect.anything(),
  skipToLabel: 'form',
  js: [],
}

describe('LanguagesPage', () => {
  it.effect.prop('when there is a value', [fc.supportedLocale(), fc.user(), fc.languages()], ([locale, user, value]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        Effect.flatMap(
          LanguagesStore.Store.use(store => store.set(user.orcid, value)),
          () => _.LanguagesPage,
        ),
        Effect.provide([LanguagesStore.layerInMemory, ...context(locale, user)]),
      )

      expect(actual).toStrictEqual(formPage)
    }),
  )

  it.effect.prop('when there is no value', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.LanguagesPage,
        Effect.provide([LanguagesStore.layerInMemory, ...context(locale, user)]),
      )

      expect(actual).toStrictEqual(formPage)
    }),
  )

  it.effect.prop("when the value can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.LanguagesPage,
        Effect.provide([
          Layer.provide(LanguagesStore.layerKeyValueStore, keyValueStoreWith({})),
          ...context(locale, user),
        ]),
      )

      expect(actual).toStrictEqual(formPage)
    }),
  )
})

describe('LanguagesSubmission', () => {
  it.effect.prop(
    'when there is an existing value',
    [fc.supportedLocale(), fc.user(), fc.languages(), fc.nonEmptyString()],
    ([locale, user, existing, value]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* LanguagesStore.Store.use(store => store.set(user.orcid, existing))

            const response = yield* _.LanguagesSubmission(UrlParams.fromInput({ languages: value }))

            return { response, saved: yield* LanguagesStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([LanguagesStore.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.some({ value, visibility: existing.visibility }))
      }),
  )

  it.effect.prop(
    "when there isn't an existing value",
    [fc.supportedLocale(), fc.user(), fc.nonEmptyString()],
    ([locale, user, value]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            const response = yield* _.LanguagesSubmission(UrlParams.fromInput({ languages: value }))

            return { response, saved: yield* LanguagesStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([LanguagesStore.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.some({ value, visibility: 'restricted' }))
      }),
  )

  it.effect.prop(
    'when the form is empty',
    [fc.supportedLocale(), fc.user(), fc.languages()],
    ([locale, user, existing]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* LanguagesStore.Store.use(store => store.set(user.orcid, existing))

            const response = yield* _.LanguagesSubmission(UrlParams.empty)

            return { response, saved: yield* LanguagesStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([LanguagesStore.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.none())
      }),
  )

  it.effect.prop("when the value can't be removed", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.LanguagesSubmission(UrlParams.empty),
        Effect.provide([
          Layer.provide(LanguagesStore.layerKeyValueStore, keyValueStoreWith({})),
          ...context(locale, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )

  it.effect.prop(
    "when the value can't be saved",
    [fc.supportedLocale(), fc.user(), fc.languages(), fc.nonEmptyString()],
    ([locale, user, existing, value]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.LanguagesSubmission(UrlParams.fromInput({ languages: value })),
          Effect.provide([
            Layer.provide(
              LanguagesStore.layerKeyValueStore,
              keyValueStoreWith({ get: () => Effect.succeed(JSON.stringify(existing)) }),
            ),
            ...context(locale, user),
          ]),
        )

        expect(actual).toStrictEqual(havingProblems)
      }),
  )

  it.effect.prop(
    "when the existing value can't be loaded",
    [fc.supportedLocale(), fc.user(), fc.nonEmptyString()],
    ([locale, user, value]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.LanguagesSubmission(UrlParams.fromInput({ languages: value })),
          Effect.provide([
            Layer.provide(LanguagesStore.layerKeyValueStore, keyValueStoreWith({})),
            ...context(locale, user),
          ]),
        )

        expect(actual).toStrictEqual(havingProblems)
      }),
  )
})
