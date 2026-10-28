import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Locale } from '../../../../src/Context.ts'
import * as DatasetReviews from '../../../../src/DatasetReviews/index.ts'
import * as Queries from '../../../../src/Queries.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/ReviewADatasetFlow/UseOfAiPage/index.ts'
import * as fc from '../../../fc.ts'

describe('UseOfAiPage', () => {
  describe('when the dataset review is by the user', () => {
    it.effect.prop(
      'when the dataset review is in progress',
      [
        fc.uuid(),
        fc.supportedLocale(),
        fc.user(),
        fc.oneof(
          fc.record({ _tag: fc.constant('AiWasUsed'), generativeAiIdeasDetails: fc.maybe(fc.nonEmptyString()) }),
          fc.record({ _tag: fc.constant('AiWasNotUsed') }),
          fc.record({ _tag: fc.constant('NotAnswered') }),
        ),
        fc.boolean(),
      ],
      ([datasetReviewId, locale, user, useOfAi, multipleAuthors]) =>
        Effect.gen(function* () {
          const actual = yield* _.UseOfAiPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.ReviewADatasetUseOfAi.href({ datasetReviewId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['conditional-inputs.js'],
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () => Effect.succeed(useOfAi),
              areThereMultipleAuthorsOnAReview: () => Effect.succeed(multipleAuthors),
            }),
          ]),
        ),
    )

    it.effect.prop(
      'when the dataset review is being published',
      [fc.uuid(), fc.supportedLocale(), fc.user()],
      ([datasetReviewId, locale, user]) =>
        Effect.gen(function* () {
          const actual = yield* _.UseOfAiPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () =>
                new DatasetReviews.DatasetReviewIsBeingPublished(),
            }),
          ]),
        ),
    )

    it.effect.prop(
      'when the dataset review has been published',
      [fc.uuid(), fc.supportedLocale(), fc.user()],
      ([datasetReviewId, locale, user]) =>
        Effect.gen(function* () {
          const actual = yield* _.UseOfAiPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () =>
                new DatasetReviews.DatasetReviewHasBeenPublished(),
            }),
          ]),
        ),
    )
  })

  it.effect.prop(
    'when the dataset review is by a different user',
    [fc.uuid(), fc.supportedLocale(), fc.user()],
    ([datasetReviewId, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.UseOfAiPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () =>
              new DatasetReviews.DatasetReviewWasStartedByAnotherUser(),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "when the dataset review hasn't been started",
    [fc.uuid(), fc.supportedLocale(), fc.user()],
    ([datasetReviewId, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.UseOfAiPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () =>
              new DatasetReviews.DatasetReviewHasNotBeenStarted(),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "when the dataset review can't been queried",
    [fc.uuid(), fc.supportedLocale(), fc.user()],
    ([datasetReviewId, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.UseOfAiPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () => new Queries.UnableToQuery({}),
          }),
        ]),
      ),
  )
})

describe('UseOfAiSubmission', () => {
  it.effect.prop('shows that there are problems', [fc.supportedLocale()], ([locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.UseOfAiSubmission()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )
})
