import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Layer, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../../src/Context.ts'
import { CareerStages } from '../../../../src/Prereviewers/index.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/MyDetails/CareerStageVisibilityPage/index.ts'
import * as fc from '../../../fc.ts'
import { keyValueStoreWith } from '../KeyValueStores.ts'

const stored = () => fc.careerStage()

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

describe('CareerStageVisibilityPage', () => {
  it.effect.prop('when there is a value', [fc.supportedLocale(), fc.user(), stored()], ([locale, user, value]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        Effect.flatMap(
          CareerStages.Store.use(store => store.set(user.orcid, value)),
          () => _.CareerStageVisibilityPage,
        ),
        Effect.provide([CareerStages.layerInMemory, Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)]),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ChangeCareerStageVisibility,
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
        _.CareerStageVisibilityPage,
        Effect.provide([CareerStages.layerInMemory, Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)]),
      )

      expect(actual).toStrictEqual(backToMyDetails)
    }),
  )

  it.effect.prop("when the value can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.CareerStageVisibilityPage,
        Effect.provide([
          Layer.provide(CareerStages.layerKeyValueStore, keyValueStoreWith({})),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})

describe('CareerStageVisibilitySubmission', () => {
  it.effect.prop(
    'when the form has been submitted',
    [fc.supportedLocale(), fc.user(), stored(), fc.constantFrom('public' as const, 'restricted' as const)],
    ([locale, user, value, visibility]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* CareerStages.Store.use(store => store.set(user.orcid, value))

            const response = yield* _.CareerStageVisibilitySubmission(
              UrlParams.fromInput({ careerStageVisibility: visibility }),
            )

            return { response, saved: yield* CareerStages.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            CareerStages.layerInMemory,
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
            yield* CareerStages.Store.use(store => store.set(user.orcid, value))

            const response = yield* _.CareerStageVisibilitySubmission(
              UrlParams.fromInput({ careerStageVisibility: visibility }),
            )

            return { response, saved: yield* CareerStages.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            CareerStages.layerInMemory,
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
          _.CareerStageVisibilitySubmission(UrlParams.empty),
          Effect.provide([
            Layer.provide(
              CareerStages.layerKeyValueStore,
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
        _.CareerStageVisibilitySubmission(UrlParams.empty),
        Effect.provide([CareerStages.layerInMemory, Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)]),
      )

      expect(actual).toStrictEqual(backToMyDetails)
    }),
  )

  it.effect.prop("when the value can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.CareerStageVisibilitySubmission(UrlParams.empty),
        Effect.provide([
          Layer.provide(CareerStages.layerKeyValueStore, keyValueStoreWith({})),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )
})
