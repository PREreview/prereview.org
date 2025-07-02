import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Locale } from '../../src/Context.js'
import { DatasetReviewWasAlreadyStarted } from '../../src/DatasetReviews/Commands/Errors.js'
import * as DatasetReviews from '../../src/DatasetReviews/index.js'
import * as _ from '../../src/ReviewADatasetFlow/StartNow/index.js'
import * as Routes from '../../src/routes.js'
import { Uuid } from '../../src/types/index.js'
import { LoggedInUser } from '../../src/user.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('StartNow', () => {
  describe("a review hasn't been started", () => {
    test.prop([fc.supportedLocale(), fc.user(), fc.uuid()])('the review can be started', (locale, user, uuid) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId: uuid }),
        })
      }).pipe(
        Effect.provide(commandsLayer({ startDatasetReview: () => Effect.void })),
        Effect.provide(queriesLayer({ findInProgressReviewForADataset: () => Effect.succeedNone })),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        Effect.provideService(Uuid.GenerateUuid, Effect.succeed(uuid)),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.supportedLocale(),
      fc.user(),
      fc.uuid(),
      fc.constantFrom(new DatasetReviews.UnableToHandleCommand({}), new DatasetReviewWasAlreadyStarted()),
    ])("the review can't be started", (locale, user, uuid, error) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.SERVICE_UNAVAILABLE,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(commandsLayer({ startDatasetReview: () => Effect.fail(error) })),
        Effect.provide(queriesLayer({ findInProgressReviewForADataset: () => Effect.succeedNone })),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        Effect.provideService(Uuid.GenerateUuid, Effect.succeed(uuid)),
        EffectTest.run,
      ),
    )
  })

  test.prop([fc.supportedLocale(), fc.user(), fc.uuid()])('a review has been started', (locale, user, reviewId) =>
    Effect.gen(function* () {
      const actual = yield* _.StartNow

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ReviewThisDatasetStartNow,
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(commandsLayer()),
      Effect.provide(queriesLayer({ findInProgressReviewForADataset: () => Effect.succeedSome(reviewId) })),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
      EffectTest.run,
    ),
  )

  test.prop([fc.supportedLocale(), fc.user(), fc.anything()])("a review can't be queried", (locale, user, cause) =>
    Effect.gen(function* () {
      const actual = yield* _.StartNow

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(commandsLayer()),
      Effect.provide(
        queriesLayer({ findInProgressReviewForADataset: () => new DatasetReviews.UnableToQuery({ cause }) }),
      ),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
      EffectTest.run,
    ),
  )
})

const commandsLayer = (implementations?: Partial<typeof DatasetReviews.DatasetReviewCommands.Service>) =>
  Layer.succeed(DatasetReviews.DatasetReviewCommands, {
    startDatasetReview: () => Effect.sync(shouldNotBeCalled),
    answerIfTheDatasetFollowsFairAndCarePrinciples: () => Effect.sync(shouldNotBeCalled),
    ...implementations,
  })

const queriesLayer = (implementations?: Partial<typeof DatasetReviews.DatasetReviewQueries.Service>) =>
  Layer.succeed(DatasetReviews.DatasetReviewQueries, {
    findInProgressReviewForADataset: () => Effect.sync(shouldNotBeCalled),
    getAuthor: () => Effect.sync(shouldNotBeCalled),
    ...implementations,
  })
