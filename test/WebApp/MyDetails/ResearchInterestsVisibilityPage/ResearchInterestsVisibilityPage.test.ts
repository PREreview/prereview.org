import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Layer, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../../src/Context.ts'
import { ResearchInterestsStore } from '../../../../src/Prereviewers/index.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/MyDetails/ResearchInterestsVisibilityPage/index.ts'
import * as fc from '../../../fc.ts'
import { keyValueStoreWith } from '../KeyValueStores.ts'

const stored = () => fc.researchInterests()

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

describe('ResearchInterestsVisibilityPage', () => {
  it.effect.prop('when there is a value', [fc.supportedLocale(), fc.user(), stored()], ([locale, user, value]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        Effect.flatMap(
          ResearchInterestsStore.Store.use(store => store.set(user.orcid, value)),
          () => _.ResearchInterestsVisibilityPage,
        ),
        Effect.provide([
          ResearchInterestsStore.layerInMemory,
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ChangeResearchInterestsVisibility,
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
        _.ResearchInterestsVisibilityPage,
        Effect.provide([
          ResearchInterestsStore.layerInMemory,
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
        _.ResearchInterestsVisibilityPage,
        Effect.provide([
          Layer.provide(ResearchInterestsStore.layerKeyValueStore, keyValueStoreWith({})),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})

describe('ResearchInterestsVisibilitySubmission', () => {
  it.effect.prop(
    'when the form has been submitted',
    [fc.supportedLocale(), fc.user(), stored(), fc.constantFrom('public' as const, 'restricted' as const)],
    ([locale, user, value, visibility]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* ResearchInterestsStore.Store.use(store => store.set(user.orcid, value))

            const response = yield* _.ResearchInterestsVisibilitySubmission(
              UrlParams.fromInput({ researchInterestsVisibility: visibility }),
            )

            return { response, saved: yield* ResearchInterestsStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            ResearchInterestsStore.layerInMemory,
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
            yield* ResearchInterestsStore.Store.use(store => store.set(user.orcid, value))

            const response = yield* _.ResearchInterestsVisibilitySubmission(
              UrlParams.fromInput({ researchInterestsVisibility: visibility }),
            )

            return { response, saved: yield* ResearchInterestsStore.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            ResearchInterestsStore.layerInMemory,
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
          _.ResearchInterestsVisibilitySubmission(UrlParams.empty),
          Effect.provide([
            Layer.provide(
              ResearchInterestsStore.layerKeyValueStore,
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
        _.ResearchInterestsVisibilitySubmission(UrlParams.empty),
        Effect.provide([
          ResearchInterestsStore.layerInMemory,
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
        _.ResearchInterestsVisibilitySubmission(UrlParams.empty),
        Effect.provide([
          Layer.provide(ResearchInterestsStore.layerKeyValueStore, keyValueStoreWith({})),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})
