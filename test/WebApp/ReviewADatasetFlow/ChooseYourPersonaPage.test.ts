import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer, Option } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/ChooseYourPersonaPage/index.ts'
import { RouteForCommand } from '../../../src/WebApp/ReviewADatasetFlow/RouteForCommand.ts'
import * as Routes from '../../../src/routes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('ChooseYourPersonaPage', () => {
  describe('when the dataset review is by the user', () => {
    describe('when the dataset review is in progress', () => {
      test.prop([
        fc.uuid(),
        fc.supportedLocale(),
        fc.user(),
        fc.maybe(fc.constantFrom('public', 'pseudonym')),
        fc.publicPersona(),
        fc.pseudonymPersona(),
      ])('when the personas can be loaded', (datasetReviewId, locale, user, chosen, publicPersona, pseudonymPersona) =>
        Effect.gen(function* () {
          const actual = yield* _.ChooseYourPersonaPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: [],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanChoosePersona: () => Effect.succeed(chosen),
            }),
          ),
          Effect.provide(
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.uuid(),
        fc.supportedLocale(),
        fc.user(),
        fc.maybe(fc.constantFrom('public', 'pseudonym')),
        fc.anything(),
      ])("when a persona can't be loaded", (datasetReviewId, locale, user, chosen, error) =>
        Effect.gen(function* () {
          const actual = yield* _.ChooseYourPersonaPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanChoosePersona: () => Effect.succeed(chosen),
            }),
          ),
          Effect.provide(
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => new Personas.UnableToGetPersona({ cause: error }),
              getPseudonymPersona: () => new Personas.UnableToGetPersona({ cause: error }),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )
    })

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review is being published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.ChooseYourPersonaPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanChoosePersona: () => new DatasetReviews.DatasetReviewIsBeingPublished(),
            }),
          ),
          Effect.provide(Layer.mock(Personas.Personas, {})),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review has been published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.ChooseYourPersonaPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanChoosePersona: () => new DatasetReviews.DatasetReviewHasBeenPublished(),
            }),
          ),
          Effect.provide(Layer.mock(Personas.Personas, {})),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    'when the dataset review is by a different user',
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanChoosePersona: () => new DatasetReviews.DatasetReviewWasStartedByAnotherUser(),
          }),
        ),
        Effect.provide(Layer.mock(Personas.Personas, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review hasn't been started",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanChoosePersona: () => new DatasetReviews.DatasetReviewHasNotBeenStarted(),
          }),
        ),
        Effect.provide(Layer.mock(Personas.Personas, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review can't been queried",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanChoosePersona: () => new Queries.UnableToQuery({}),
          }),
        ),
        Effect.provide(Layer.mock(Personas.Personas, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})

describe('ChooseYourPersonaSubmission', () => {
  describe('when there is an choice', () => {
    describe('when the choice can be saved', () => {
      test.prop([
        fc.uuid(),
        fc.urlParams(fc.record({ chooseYourPersona: fc.constantFrom('public', 'pseudonym') })),
        fc.supportedLocale(),
        fc.user(),
        fc.datasetReviewNextExpectedCommand(),
      ])('the next expected command can be found', (datasetReviewId, body, locale, user, nextExpectedCommand) =>
        Effect.gen(function* () {
          const actual = yield* _.ChooseYourPersonaSubmission({ body, datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { choosePersona: () => Effect.void })),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getNextExpectedCommandForAUserOnADatasetReview: () => Effect.succeedSome(nextExpectedCommand),
            }),
          ),
          Effect.provide(Layer.mock(Personas.Personas, {})),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.uuid(),
        fc.urlParams(fc.record({ chooseYourPersona: fc.constantFrom('public', 'pseudonym') })),
        fc.supportedLocale(),
        fc.user(),
        fc.oneof(
          fc.anything().map(cause => new Queries.UnableToQuery({ cause })),
          fc.anything().map(cause => new DatasetReviews.UnknownDatasetReview({ cause })),
          fc.constant(Effect.succeedNone),
        ),
      ])("the next expected command can't be found", (datasetReviewId, body, locale, user, result) =>
        Effect.gen(function* () {
          const actual = yield* _.ChooseYourPersonaSubmission({ body, datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { choosePersona: () => Effect.void })),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getNextExpectedCommandForAUserOnADatasetReview: () => result,
            }),
          ),
          Effect.provide(Layer.mock(Personas.Personas, {})),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.uuid(),
      fc.urlParams(fc.record({ chooseYourPersona: fc.constantFrom('public', 'pseudonym') })),
      fc.supportedLocale(),
      fc.user(),
      fc.constantFrom(
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewIsBeingPublished(),
        new DatasetReviews.DatasetReviewHasBeenPublished(),
      ),
    ])("when the choice can't be saved", (datasetReviewId, body, locale, user, error) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaSubmission({ body, datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { choosePersona: () => error })),
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
        Effect.provide(Layer.mock(Personas.Personas, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )
  })

  describe("when there isn't an choice", () => {
    test.prop([
      fc.uuid(),
      fc.oneof(
        fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'chooseYourPersona'))),
        fc.urlParams(
          fc.record({
            chooseYourPersona: fc.string().filter(string => !['public', 'pseudonym'].includes(string)),
          }),
        ),
      ),
      fc.supportedLocale(),
      fc.user(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
    ])('when the personas can be loaded', (datasetReviewId, body, locale, user, publicPersona, pseudonymPersona) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaSubmission({ body, datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId }),
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
        Effect.provide(
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.uuid(),
      fc.oneof(
        fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'chooseYourPersona'))),
        fc.urlParams(
          fc.record({
            chooseYourPersona: fc.string().filter(string => !['public', 'pseudonym'].includes(string)),
          }),
        ),
      ),
      fc.supportedLocale(),
      fc.user(),
      fc.anything(),
    ])("when the personas can't be loaded", (datasetReviewId, body, locale, user, error) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaSubmission({ body, datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
        Effect.provide(
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => new Personas.UnableToGetPersona({ cause: error }),
            getPseudonymPersona: () => new Personas.UnableToGetPersona({ cause: error }),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )
  })
})
