import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer, Option } from 'effect'
import { Locale } from '../../src/Context.js'
import * as DatasetReviews from '../../src/DatasetReviews/index.js'
import * as _ from '../../src/ReviewADatasetFlow/RateTheQualityQuestion/index.js'
import { RouteForCommand } from '../../src/ReviewADatasetFlow/RouteForCommand.js'
import * as Routes from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { LoggedInUser } from '../../src/user.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('RateTheQualityQuestion', () => {
  describe('when the dataset review is by the user', () => {
    test.prop([
      fc.uuid(),
      fc.supportedLocale(),
      fc.user(),
      fc.maybe(fc.constantFrom('excellent', 'fair', 'poor', 'unsure')),
    ])('when the dataset review is in progress', (datasetReviewId, locale, user, answer) =>
      Effect.gen(function* () {
        const actual = yield* _.RateTheQualityQuestion({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanRateTheQuality: () => Effect.succeed(answer),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review is being published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.RateTheQualityQuestion({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanRateTheQuality: () => new DatasetReviews.DatasetReviewIsBeingPublished(),
              getAuthor: () => Effect.succeed(user.orcid),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review has been published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.RateTheQualityQuestion({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanRateTheQuality: () => new DatasetReviews.DatasetReviewHasBeenPublished(),
              getAuthor: () => Effect.succeed(user.orcid),
            }),
          ),
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
        const actual = yield* _.RateTheQualityQuestion({ datasetReviewId })

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
            checkIfUserCanRateTheQuality: () => new DatasetReviews.DatasetReviewWasStartedByAnotherUser(),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review hasn't been started",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.RateTheQualityQuestion({ datasetReviewId })

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
            checkIfUserCanRateTheQuality: () => new DatasetReviews.DatasetReviewHasNotBeenStarted(),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review can't been queried",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.RateTheQualityQuestion({ datasetReviewId })

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
            checkIfUserCanRateTheQuality: () => new DatasetReviews.UnableToQuery({}),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})

describe('RateTheQualitySubmission', () => {
  describe('when there is an answer', () => {
    describe('when the answer can be saved', () => {
      test.prop([
        fc.uuid(),
        fc.urlParams(fc.record({ qualityRating: fc.constantFrom('excellent', 'fair', 'poor', 'unsure') })),
        fc.supportedLocale(),
        fc.user(),
        fc.constantFrom(
          'AnswerIfTheDatasetFollowsFairAndCarePrinciples',
          'AnswerIfTheDatasetHasEnoughMetadata',
          'AnswerIfTheDatasetHasTrackedChanges',
          'AnswerIfTheDatasetHasDataCensoredOrDeleted',
          'PublishDatasetReview',
        ),
      ])('the next expected command can be found', (datasetReviewId, body, locale, user, nextExpectedCommand) =>
        Effect.gen(function* () {
          const actual = yield* _.RateTheQualitySubmission({ body, datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewCommands, {
              rateTheQuality: () => Effect.void,
            }),
          ),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getNextExpectedCommandForAUserOnADatasetReview: () => Effect.succeedSome(nextExpectedCommand),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.uuid(),
        fc.urlParams(fc.record({ qualityRating: fc.constantFrom('excellent', 'fair', 'poor', 'unsure') })),
        fc.supportedLocale(),
        fc.user(),
        fc.oneof(
          fc.anything().map(cause => new DatasetReviews.UnableToQuery({ cause })),
          fc.anything().map(cause => new DatasetReviews.UnknownDatasetReview({ cause })),
          fc.constant(Effect.succeedNone),
        ),
      ])("the next expected command can't be found", (datasetReviewId, body, locale, user, result) =>
        Effect.gen(function* () {
          const actual = yield* _.RateTheQualitySubmission({ body, datasetReviewId })

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
            Layer.mock(DatasetReviews.DatasetReviewCommands, {
              rateTheQuality: () => Effect.void,
            }),
          ),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getNextExpectedCommandForAUserOnADatasetReview: () => result,
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.uuid(),
      fc.urlParams(fc.record({ qualityRating: fc.constantFrom('excellent', 'fair', 'poor', 'unsure') })),
      fc.supportedLocale(),
      fc.user(),
      fc.constantFrom(
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewIsBeingPublished(),
        new DatasetReviews.DatasetReviewHasBeenPublished(),
      ),
    ])("when the answer can't be saved", (datasetReviewId, body, locale, user, error) =>
      Effect.gen(function* () {
        const actual = yield* _.RateTheQualitySubmission({ body, datasetReviewId })

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
          Layer.mock(DatasetReviews.DatasetReviewCommands, {
            rateTheQuality: () => error,
          }),
        ),
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.oneof(
      fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'qualityRating'))),
      fc.urlParams(
        fc.record({
          qualityRating: fc.string().filter(string => !['excellent', 'fair', 'poor', 'unsure'].includes(string)),
        }),
      ),
    ),
    fc.supportedLocale(),
    fc.user(),
  ])("when there isn't an answer", (datasetReviewId, body, locale, user) =>
    Effect.gen(function* () {
      const actual = yield* _.RateTheQualitySubmission({ body, datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId }),
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    }).pipe(
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
  )
})
