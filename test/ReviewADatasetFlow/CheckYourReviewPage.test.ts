import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Equal, Layer, Struct, Tuple } from 'effect'
import { Locale } from '../../src/Context.js'
import * as DatasetReviews from '../../src/DatasetReviews/index.js'
import * as _ from '../../src/ReviewADatasetFlow/CheckYourReviewPage/index.js'
import * as Routes from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import type { Uuid } from '../../src/types/index.js'
import { LoggedInUser } from '../../src/user.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('CheckYourReviewPage', () => {
  describe('when the dataset review is by the user', () => {
    test.prop([
      fc.uuid(),
      fc.supportedLocale(),
      fc.user(),
      fc.record<DatasetReviews.DatasetReviewPreview>({
        qualityRating: fc.maybe(fc.ratedTheQualityOfTheDataset().map(Struct.get('rating'))),
        answerToIfTheDatasetFollowsFairAndCarePrinciples: fc
          .answeredIfTheDatasetFollowsFairAndCarePrinciples()
          .map(Struct.get('answer')),
        answerToIfTheDatasetHasEnoughMetadata: fc.maybe(
          fc.answeredIfTheDatasetHasEnoughMetadata().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetHasTrackedChanges: fc.maybe(
          fc.answeredIfTheDatasetHasTrackedChanges().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(
          fc.answeredIfTheDatasetHasDataCensoredOrDeleted().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
          fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(
          fc.answeredIfTheDatasetSupportsRelatedConclusions().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsDetailedEnough: fc.maybe(
          fc.answeredIfTheDatasetIsDetailedEnough().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsErrorFree: fc.maybe(fc.answeredIfTheDatasetIsErrorFree().map(Struct.get('answer'))),
        answerToIfTheDatasetMattersToItsAudience: fc.maybe(
          fc.answeredIfTheDatasetMattersToItsAudience().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsReadyToBeShared: fc.maybe(
          fc.answeredIfTheDatasetIsReadyToBeShared().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsMissingAnything: fc.maybe(
          fc.answeredIfTheDatasetIsMissingAnything().map(Struct.get('answer')),
        ),
      }),
    ])('when the dataset review is in progress', (datasetReviewId, locale, user, preview) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['single-use-form.js'],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getAuthor: () => Effect.succeed(user.orcid),
            getPreviewForAReviewReadyToBePublished: () => Effect.succeed(preview),
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
      fc.constantFrom<
        Array<
          [DatasetReviews.DatasetReviewNotReadyToBePublished['missing'], Routes.Route<{ datasetReviewId: Uuid.Uuid }>]
        >
      >(
        Tuple.make(
          ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples', 'AnsweredIfTheDatasetHasEnoughMetadata'],
          Routes.ReviewADatasetFollowsFairAndCarePrinciples,
        ),
        Tuple.make(['AnsweredIfTheDatasetHasEnoughMetadata'], Routes.ReviewADatasetHasEnoughMetadata),
      ),
    ])("when the dataset review isn't ready to be published", (datasetReviewId, locale, user, [missing, expected]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expected.href({ datasetReviewId }),
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getAuthor: () => Effect.succeed(user.orcid),
            getPreviewForAReviewReadyToBePublished: () =>
              new DatasetReviews.DatasetReviewNotReadyToBePublished({ missing }),
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
          const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPreviewForAReviewReadyToBePublished: () => new DatasetReviews.DatasetReviewIsBeingPublished(),
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
          const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPreviewForAReviewReadyToBePublished: () => new DatasetReviews.DatasetReviewHasBeenPublished(),
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
    fc.supportedLocale(),
    fc
      .tuple(fc.user(), fc.orcid())
      .filter(([user, datasetReviewAuthor]) => !Equal.equals(user.orcid, datasetReviewAuthor)),
  ])('when the dataset review is by a different user', (datasetReviewId, locale, [user, datasetReviewAuthor]) =>
    Effect.gen(function* () {
      const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

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
        Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(datasetReviewAuthor) }),
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
        const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

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
            getAuthor: () => new DatasetReviews.UnknownDatasetReview({}),
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
        const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

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
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => new DatasetReviews.UnableToQuery({}) }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})

describe('CheckYourReviewSubmission', () => {
  describe('when the form is submitted', () => {
    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the review can be published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { publishDatasetReview: () => Effect.void })),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(user.orcid) }),
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
      fc.constantFrom(
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewNotReadyToBePublished({
          missing: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples'],
        }),
        new DatasetReviews.DatasetReviewIsBeingPublished(),
        new DatasetReviews.DatasetReviewHasBeenPublished(),
      ),
    ])("when the review can't be published", (datasetReviewId, locale, user, error) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

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
          Layer.mock(DatasetReviews.DatasetReviewCommands, { publishDatasetReview: () => Effect.fail(error) }),
        ),
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(user.orcid) }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.supportedLocale(),
    fc
      .tuple(fc.user(), fc.orcid())
      .filter(([user, datasetReviewAuthor]) => !Equal.equals(user.orcid, datasetReviewAuthor)),
  ])('when the dataset review is by a different user', (datasetReviewId, locale, [user, datasetReviewAuthor]) =>
    Effect.gen(function* () {
      const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
      Effect.provide(
        Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(datasetReviewAuthor) }),
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
        const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getAuthor: () => new DatasetReviews.UnknownDatasetReview({}),
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
        const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

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
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => new DatasetReviews.UnableToQuery({}) }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})
