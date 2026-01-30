import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { Uuid } from '../../../src/types/index.ts'
import { LoggedInUser } from '../../../src/user.ts'
import { RouteForCommand } from '../../../src/WebApp/ReviewADatasetFlow/RouteForCommand.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/StartNow/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('StartNow', () => {
  describe("a review hasn't been started", () => {
    describe('the review can be started', () => {
      test.prop([
        fc.supportedLocale(),
        fc.datasetId(),
        fc.user(),
        fc.datasetTitle(),
        fc.uuid(),
        fc.datasetReviewNextExpectedCommand(),
      ])('the next expected command can be found', (locale, datasetId, user, dataset, uuid, nextExpectedCommand) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ datasetId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId: uuid }),
          })
        }).pipe(
          Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { startDatasetReview: () => Effect.void })),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              findInProgressReviewForADataset: () => Effect.succeedNone,
              getNextExpectedCommandForAUserOnADatasetReview: () => Effect.succeedSome(nextExpectedCommand),
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDatasetTitle: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          Effect.provideService(Uuid.GenerateUuid, Effect.succeed(uuid)),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.supportedLocale(),
        fc.datasetId(),
        fc.user(),
        fc.datasetTitle(),
        fc.uuid(),
        fc.oneof(
          fc.anything().map(cause => new Queries.UnableToQuery({ cause })),
          fc.anything().map(cause => new DatasetReviews.UnknownDatasetReview({ cause })),
          fc.constant(Effect.succeedNone),
        ),
      ])("the next expected command can't be found", (locale, datasetId, user, dataset, uuid, result) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ datasetId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { startDatasetReview: () => Effect.void })),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              findInProgressReviewForADataset: () => Effect.succeedNone,
              getNextExpectedCommandForAUserOnADatasetReview: () => result,
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDatasetTitle: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          Effect.provideService(Uuid.GenerateUuid, Effect.succeed(uuid)),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.supportedLocale(),
      fc.datasetId(),
      fc.user(),
      fc.datasetTitle(),
      fc.uuid(),
      fc.constantFrom(
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
        new DatasetReviews.DatasetReviewWasAlreadyStarted(),
      ),
    ])("the review can't be started", (locale, datasetId, user, dataset, uuid, error) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow({ datasetId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { startDatasetReview: () => error })),
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findInProgressReviewForADataset: () => Effect.succeedNone,
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDatasetTitle: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        Effect.provideService(Uuid.GenerateUuid, Effect.succeed(uuid)),
        EffectTest.run,
      ),
    )
  })

  describe('a review has been started', () => {
    test.prop([
      fc.supportedLocale(),
      fc.datasetId(),
      fc.user(),
      fc.datasetTitle(),
      fc.uuid(),
      fc.datasetReviewNextExpectedCommand(),
    ])('the next expected command can be found', (locale, datasetId, user, dataset, reviewId, nextExpectedCommand) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow({ datasetId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.ReviewThisDatasetStartNow.href({ datasetId: dataset.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findInProgressReviewForADataset: () => Effect.succeedSome(reviewId),
            getNextExpectedCommandForAUserOnADatasetReview: () => Effect.succeedSome(nextExpectedCommand),
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDatasetTitle: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
        EffectTest.run,
      ),
    )
    test.prop([
      fc.supportedLocale(),
      fc.datasetId(),
      fc.user(),
      fc.datasetTitle(),
      fc.uuid(),
      fc.oneof(
        fc.anything().map(cause => new Queries.UnableToQuery({ cause })),
        fc.anything().map(cause => new DatasetReviews.UnknownDatasetReview({ cause })),
        fc.constant(Effect.succeedNone),
      ),
    ])("the next expected command can't be found", (locale, datasetId, user, dataset, reviewId, result) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow({ datasetId })

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
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findInProgressReviewForADataset: () => Effect.succeedSome(reviewId),
            getNextExpectedCommandForAUserOnADatasetReview: () => result,
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDatasetTitle: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.supportedLocale(),
    fc.datasetId(),
    fc.user(),
    fc.record({ cause: fc.anything(), datasetId: fc.datasetId() }).map(args => new Datasets.DatasetIsUnavailable(args)),
    fc.maybe(fc.uuid()),
  ])("the dataset can't be loaded", (locale, datasetId, user, error, reviewId) =>
    Effect.gen(function* () {
      const actual = yield* _.StartNow({ datasetId })

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
        Layer.mock(DatasetReviews.DatasetReviewQueries, {
          findInProgressReviewForADataset: () => Effect.succeed(reviewId),
        }),
      ),
      Effect.provide(
        Layer.mock(Datasets.Datasets, {
          getDatasetTitle: () => error,
        }),
      ),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.supportedLocale(),
    fc.datasetId(),
    fc.user(),
    fc.record({ cause: fc.anything(), datasetId: fc.datasetId() }).map(args => new Datasets.DatasetIsNotFound(args)),
    fc.maybe(fc.uuid()),
  ])("the dataset can't be found", (locale, datasetId, user, error, reviewId) =>
    Effect.gen(function* () {
      const actual = yield* _.StartNow({ datasetId })

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
          findInProgressReviewForADataset: () => Effect.succeed(reviewId),
        }),
      ),
      Effect.provide(
        Layer.mock(Datasets.Datasets, {
          getDatasetTitle: () => error,
        }),
      ),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
      EffectTest.run,
    ),
  )

  test.prop([fc.supportedLocale(), fc.datasetId(), fc.user(), fc.datasetTitle(), fc.anything()])(
    "a review can't be queried",
    (locale, datasetId, user, dataset, cause) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow({ datasetId })

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
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findInProgressReviewForADataset: () => new Queries.UnableToQuery({ cause }),
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDatasetTitle: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
        EffectTest.run,
      ),
  )
})
