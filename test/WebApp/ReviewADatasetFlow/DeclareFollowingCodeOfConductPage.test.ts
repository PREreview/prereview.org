import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer, Option } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/DeclareFollowingCodeOfConductPage/index.ts'
import { RouteForCommand } from '../../../src/WebApp/ReviewADatasetFlow/RouteForCommand.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('DeclareFollowingCodeOfConductPage', () => {
  describe('when the dataset review is by the user', () => {
    test.prop([fc.uuid(), fc.supportedLocale(), fc.user(), fc.boolean()])(
      'when the dataset review is in progress',
      (datasetReviewId, locale, user, followingCodeOfConduct) =>
        Effect.gen(function* () {
          const actual = yield* _.DeclareFollowingCodeOfConductPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.ReviewADatasetDeclareFollowingCodeOfConduct.href({ datasetReviewId }),
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
              checkIfUserCanDeclareFollowingCodeOfConduct: () => Effect.succeed(followingCodeOfConduct),
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
          const actual = yield* _.DeclareFollowingCodeOfConductPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanDeclareFollowingCodeOfConduct: () => new DatasetReviews.DatasetReviewIsBeingPublished(),
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
          const actual = yield* _.DeclareFollowingCodeOfConductPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanDeclareFollowingCodeOfConduct: () => new DatasetReviews.DatasetReviewHasBeenPublished(),
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
        const actual = yield* _.DeclareFollowingCodeOfConductPage({ datasetReviewId })

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
            checkIfUserCanDeclareFollowingCodeOfConduct: () =>
              new DatasetReviews.DatasetReviewWasStartedByAnotherUser(),
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
        const actual = yield* _.DeclareFollowingCodeOfConductPage({ datasetReviewId })

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
            checkIfUserCanDeclareFollowingCodeOfConduct: () => new DatasetReviews.DatasetReviewHasNotBeenStarted(),
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
        const actual = yield* _.DeclareFollowingCodeOfConductPage({ datasetReviewId })

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
            checkIfUserCanDeclareFollowingCodeOfConduct: () => new DatasetReviews.UnableToQuery({}),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})

describe('DeclareFollowingCodeOfConductSubmission', () => {
  describe('when there is a declaration', () => {
    describe('when the declaration can be saved', () => {
      test.prop([
        fc.uuid(),
        fc.urlParams(fc.constant({ followingCodeOfConduct: 'yes' })),
        fc.supportedLocale(),
        fc.user(),
        fc.datasetReviewNextExpectedCommand(),
      ])('the next expected command can be found', (datasetReviewId, body, locale, user, nextExpectedCommand) =>
        Effect.gen(function* () {
          const actual = yield* _.DeclareFollowingCodeOfConductSubmission({ body, datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewCommands, {
              declareFollowingCodeOfConduct: () => Effect.void,
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
        fc.urlParams(fc.constant({ followingCodeOfConduct: 'yes' })),
        fc.supportedLocale(),
        fc.user(),
        fc.oneof(
          fc.anything().map(cause => new DatasetReviews.UnableToQuery({ cause })),
          fc.anything().map(cause => new DatasetReviews.UnknownDatasetReview({ cause })),
          fc.constant(Effect.succeedNone),
        ),
      ])("the next expected command can't be found", (datasetReviewId, body, locale, user, result) =>
        Effect.gen(function* () {
          const actual = yield* _.DeclareFollowingCodeOfConductSubmission({ body, datasetReviewId })

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
              declareFollowingCodeOfConduct: () => Effect.void,
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
      fc.urlParams(fc.constant({ followingCodeOfConduct: 'yes' })),
      fc.supportedLocale(),
      fc.user(),
      fc.constantFrom(
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewIsBeingPublished(),
        new DatasetReviews.DatasetReviewHasBeenPublished(),
      ),
    ])("when the declaration can't be saved", (datasetReviewId, body, locale, user, error) =>
      Effect.gen(function* () {
        const actual = yield* _.DeclareFollowingCodeOfConductSubmission({ body, datasetReviewId })

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
            declareFollowingCodeOfConduct: () => error,
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
      fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'followingCodeOfConduct'))),
      fc.urlParams(fc.record({ followingCodeOfConduct: fc.string().filter(string => string !== 'yes') })),
    ),
    fc.supportedLocale(),
    fc.user(),
  ])("when there isn't a declaration", (datasetReviewId, body, locale, user) =>
    Effect.gen(function* () {
      const actual = yield* _.DeclareFollowingCodeOfConductSubmission({ body, datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: Routes.ReviewADatasetDeclareFollowingCodeOfConduct.href({ datasetReviewId }),
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
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
  )
})
