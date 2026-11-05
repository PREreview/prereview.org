import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Layer, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../../src/Context.ts'
import { CareerStages } from '../../../../src/Prereviewers/index.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import type { SupportedLocale } from '../../../../src/locales/index.ts'
import { LoggedInUser, type User } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/MyDetails/CareerStagePage/index.ts'
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
  canonical: Routes.ChangeCareerStage,
  status: StatusCodes.OK,
  title: expect.anything(),
  nav: expect.anything(),
  main: expect.anything(),
  skipToLabel: 'form',
  js: [],
}

const invalidPage = {
  _tag: 'PageResponse',
  canonical: Routes.ChangeCareerStage,
  status: StatusCodes.BadRequest,
  title: expect.anything(),
  nav: expect.anything(),
  main: expect.anything(),
  skipToLabel: 'form',
  js: ['error-summary.js'],
}

describe('CareerStagePage', () => {
  it.effect.prop(
    'when there is a value',
    [fc.supportedLocale(), fc.user(), fc.careerStage()],
    ([locale, user, value]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          Effect.flatMap(
            CareerStages.Store.use(store => store.set(user.orcid, value)),
            () => _.CareerStagePage,
          ),
          Effect.provide([CareerStages.layerInMemory, ...context(locale, user)]),
        )

        expect(actual).toStrictEqual(formPage)
      }),
  )

  it.effect.prop('when there is no value', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.CareerStagePage,
        Effect.provide([CareerStages.layerInMemory, ...context(locale, user)]),
      )

      expect(actual).toStrictEqual(formPage)
    }),
  )

  it.effect.prop("when the value can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.CareerStagePage,
        Effect.provide([
          Layer.provide(CareerStages.layerKeyValueStore, keyValueStoreWith({})),
          ...context(locale, user),
        ]),
      )

      expect(actual).toStrictEqual(formPage)
    }),
  )
})

describe('CareerStageSubmission', () => {
  it.effect.prop(
    'when there is an existing career stage',
    [fc.supportedLocale(), fc.user(), fc.careerStage(), fc.careerStageValue()],
    ([locale, user, existing, careerStage]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* CareerStages.Store.use(store => store.set(user.orcid, existing))

            const response = yield* _.CareerStageSubmission(UrlParams.fromInput({ careerStage }))

            return { response, saved: yield* CareerStages.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([CareerStages.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.some({ value: careerStage, visibility: existing.visibility }))
      }),
  )

  it.effect.prop(
    "when there isn't an existing career stage",
    [fc.supportedLocale(), fc.user(), fc.careerStageValue()],
    ([locale, user, careerStage]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            const response = yield* _.CareerStageSubmission(UrlParams.fromInput({ careerStage }))

            return { response, saved: yield* CareerStages.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([CareerStages.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.some({ value: careerStage, visibility: 'restricted' }))
      }),
  )

  it.effect.prop(
    'when it is skipped',
    [fc.supportedLocale(), fc.user(), fc.careerStage()],
    ([locale, user, existing]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* CareerStages.Store.use(store => store.set(user.orcid, existing))

            const response = yield* _.CareerStageSubmission(UrlParams.fromInput({ careerStage: 'skip' }))

            return { response, saved: yield* CareerStages.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([CareerStages.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(backToMyDetails)
        expect(saved).toStrictEqual(Option.none())
      }),
  )

  it.effect.prop(
    'when the form is invalid',
    [fc.supportedLocale(), fc.user(), fc.careerStage()],
    ([locale, user, existing]) =>
      Effect.gen(function* () {
        const { response, saved } = yield* pipe(
          Effect.gen(function* () {
            yield* CareerStages.Store.use(store => store.set(user.orcid, existing))

            const response = yield* _.CareerStageSubmission(UrlParams.empty)

            return { response, saved: yield* CareerStages.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([CareerStages.layerInMemory, ...context(locale, user)]),
        )

        expect(response).toStrictEqual(invalidPage)
        expect(saved).toStrictEqual(Option.some(existing))
      }),
  )

  it.effect.prop("when it can't be removed", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.CareerStageSubmission(UrlParams.fromInput({ careerStage: 'skip' })),
        Effect.provide([
          Layer.provide(CareerStages.layerKeyValueStore, keyValueStoreWith({})),
          ...context(locale, user),
        ]),
      )

      expect(actual).toStrictEqual(havingProblems)
    }),
  )

  it.effect.prop(
    "when it can't be saved",
    [fc.supportedLocale(), fc.user(), fc.careerStage(), fc.careerStageValue()],
    ([locale, user, existing, careerStage]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.CareerStageSubmission(UrlParams.fromInput({ careerStage })),
          Effect.provide([
            Layer.provide(
              CareerStages.layerKeyValueStore,
              keyValueStoreWith({ get: () => Effect.succeed(JSON.stringify(existing)) }),
            ),
            ...context(locale, user),
          ]),
        )

        expect(actual).toStrictEqual(havingProblems)
      }),
  )

  it.effect.prop(
    "when the existing career stage can't be loaded",
    [fc.supportedLocale(), fc.user(), fc.careerStageValue()],
    ([locale, user, careerStage]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.CareerStageSubmission(UrlParams.fromInput({ careerStage })),
          Effect.provide([
            Layer.provide(CareerStages.layerKeyValueStore, keyValueStoreWith({})),
            ...context(locale, user),
          ]),
        )

        expect(actual).toStrictEqual(havingProblems)
      }),
  )
})
