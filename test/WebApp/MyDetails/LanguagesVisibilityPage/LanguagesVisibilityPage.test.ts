import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Layer, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../../src/Context.ts'
import { LanguagesStore } from '../../../../src/Prereviewers/index.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/MyDetails/LanguagesVisibilityPage/index.ts'
import * as fc from '../../../fc.ts'
import { keyValueStoreWith } from '../KeyValueStores.ts'

const stored = () => fc.languages()

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

describe('LanguagesVisibilityPage', () => {
  it.effect.prop('when there is a value', [fc.supportedLocale(), fc.user(), stored()], ([locale, user, value]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        Effect.flatMap(
          LanguagesStore.Store.use(store => store.set(user.orcid, value)),
          () => _.LanguagesVisibilityPage,
        ),
        Effect.provide([
          LanguagesStore.layerInMemory,
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ChangeLanguagesVisibility,
        status: StatusCodes.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: [],
      })
    }),
  )

  it.effect.prop('when there is no value', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.LanguagesVisibilityPage,
        Effect.provide([
          LanguagesStore.layerInMemory,
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
        _.LanguagesVisibilityPage,
        Effect.provide([
          Layer.provide(LanguagesStore.layerKeyValueStore, keyValueStoreWith({})),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})

describe('LanguagesVisibilitySubmission', () => {
  it.effect.prop(
    'when the form has been submitted',
    [fc.supportedLocale(), fc.user(), stored(), fc.constantFrom('public' as const, 'restricted' as const)],
    ([locale, user, value, visibility]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* LanguagesStore.Store.use(store => store.set(user.orcid, value))

            const response = yield* _.LanguagesVisibilitySubmission(
              UrlParams.fromInput({ languagesVisibility: visibility }),
            )

            return { response, saved: yield* LanguagesStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            LanguagesStore.layerInMemory,
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
            yield* LanguagesStore.Store.use(store => store.set(user.orcid, value))

            const response = yield* _.LanguagesVisibilitySubmission(
              UrlParams.fromInput({ languagesVisibility: visibility }),
            )

            return { response, saved: yield* LanguagesStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            LanguagesStore.layerInMemory,
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.some({ ...value, visibility: 'restricted' }))
      }),
  )

  it.effect.prop(
    "when the change can't be saved",
    [fc.supportedLocale(), fc.user(), stored()],
    ([locale, user, value]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.LanguagesVisibilitySubmission(UrlParams.empty),
          Effect.provide([
            Layer.provide(
              LanguagesStore.layerKeyValueStore,
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
        _.LanguagesVisibilitySubmission(UrlParams.empty),
        Effect.provide([
          LanguagesStore.layerInMemory,
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
        _.LanguagesVisibilitySubmission(UrlParams.empty),
        Effect.provide([
          Layer.provide(LanguagesStore.layerKeyValueStore, keyValueStoreWith({})),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})
