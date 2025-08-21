import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Equal, Layer, Option } from 'effect'
import { Locale } from '../../src/Context.js'
import * as DatasetReviews from '../../src/DatasetReviews/index.js'
import * as _ from '../../src/ReviewADatasetFlow/FollowsFairAndCarePrinciplesQuestion/index.js'
import * as Routes from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { LoggedInUser } from '../../src/user.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('FollowsFairAndCarePrinciplesQuestion', () => {
  describe('when the dataset review is by the user', () => {
    test.prop([fc.uuid(), fc.supportedLocale(), fc.user(), fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure'))])(
      'when the dataset review is in progress',
      (datasetReviewId, locale, user, answer) =>
        Effect.gen(function* () {
          const actual = yield* _.FollowsFairAndCarePrinciplesQuestion({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: [],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfReviewIsInProgress: () => Effect.void,
              getAuthor: () => Effect.succeed(user.orcid),
              getAnswerToIfTheDatasetFollowsFairAndCarePrinciples: () => Effect.succeed(answer),
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
          const actual = yield* _.FollowsFairAndCarePrinciplesQuestion({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfReviewIsInProgress: () => new DatasetReviews.DatasetReviewIsBeingPublished(),
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
          const actual = yield* _.FollowsFairAndCarePrinciplesQuestion({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfReviewIsInProgress: () => new DatasetReviews.DatasetReviewHasBeenPublished(),
              getAuthor: () => Effect.succeed(user.orcid),
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
      const actual = yield* _.FollowsFairAndCarePrinciplesQuestion({ datasetReviewId })

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
        const actual = yield* _.FollowsFairAndCarePrinciplesQuestion({ datasetReviewId })

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
        const actual = yield* _.FollowsFairAndCarePrinciplesQuestion({ datasetReviewId })

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

describe('FollowsFairAndCarePrinciplesSubmission', () => {
  describe('when there is an answer', () => {
    test.prop([
      fc.uuid(),
      fc.urlParams(fc.record({ followsFairAndCarePrinciples: fc.constantFrom('yes', 'partly', 'no', 'unsure') })),
      fc.supportedLocale(),
      fc.user(),
    ])('when the answer can be saved', (datasetReviewId, body, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.FollowsFairAndCarePrinciplesSubmission({ body, datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId }),
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {
            answerIfTheDatasetFollowsFairAndCarePrinciples: () => Effect.void,
          }),
        ),
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
      fc.urlParams(fc.record({ followsFairAndCarePrinciples: fc.constantFrom('yes', 'partly', 'no', 'unsure') })),
      fc.supportedLocale(),
      fc.user(),
      fc.constantFrom(
        new DatasetReviews.UnableToHandleCommand({}),
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewIsBeingPublished(),
        new DatasetReviews.DatasetReviewHasBeenPublished(),
      ),
    ])("when the answer can't be saved", (datasetReviewId, body, locale, user, error) =>
      Effect.gen(function* () {
        const actual = yield* _.FollowsFairAndCarePrinciplesSubmission({ body, datasetReviewId })

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
            answerIfTheDatasetFollowsFairAndCarePrinciples: () => error,
          }),
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
    fc.oneof(
      fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'followsFairAndCarePrinciples'))),
      fc.urlParams(
        fc.record({
          followsFairAndCarePrinciples: fc
            .string()
            .filter(string => !['yes', 'partly', 'no', 'unsure'].includes(string)),
        }),
      ),
    ),
    fc.supportedLocale(),
    fc.user(),
  ])("when there isn't an answer", (datasetReviewId, body, locale, user) =>
    Effect.gen(function* () {
      const actual = yield* _.FollowsFairAndCarePrinciplesSubmission({ body, datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId }),
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    }).pipe(
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(user.orcid) })),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.urlParams(),
    fc.supportedLocale(),
    fc
      .tuple(fc.user(), fc.orcid())
      .filter(([user, datasetReviewAuthor]) => !Equal.equals(user.orcid, datasetReviewAuthor)),
  ])('when the dataset review is by a different user', (datasetReviewId, body, locale, [user, datasetReviewAuthor]) =>
    Effect.gen(function* () {
      const actual = yield* _.FollowsFairAndCarePrinciplesSubmission({ body, datasetReviewId })

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

  test.prop([fc.uuid(), fc.urlParams(), fc.supportedLocale(), fc.user()])(
    "when the dataset review hasn't been started",
    (datasetReviewId, body, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.FollowsFairAndCarePrinciplesSubmission({ body, datasetReviewId })

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

  test.prop([fc.uuid(), fc.urlParams(), fc.supportedLocale(), fc.user()])(
    "when the dataset review can't been queried",
    (datasetReviewId, body, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.FollowsFairAndCarePrinciplesSubmission({ body, datasetReviewId })

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
