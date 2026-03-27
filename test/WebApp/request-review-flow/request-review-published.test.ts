import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/request-review-flow/index.ts'
import * as Routes from '../../../src/routes.ts'
import { requestReviewPublishedMatch } from '../../../src/routes.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('requestReviewPublished', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.uuid(),
      fc.supportedLocale(),
    ])('when the review has been completed', (preprint, user, preprintTitle, reviewRequest, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestQueries>()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPublished({ preprint, user, locale })({
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(requestReviewPublishedMatch.formatter, { id: preprintTitle.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPublishedReviewRequestByAPrereviewer: () => Effect.succeed(reviewRequest),
          }),
        ),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when the review isn't found", (preprint, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestQueries>()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPublished({ preprint, user, locale })({
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
          })(),
        )

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
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPublishedReviewRequestByAPrereviewer: () => new ReviewRequests.UnknownReviewRequest({}),
          }),
        ),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when the review can't be loaded", (preprint, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const getPublishedReviewRequestByAPrereviewer = jest.fn<
          (typeof ReviewRequests.ReviewRequestQueries.Service)['getPublishedReviewRequestByAPrereviewer']
        >(_ => new Queries.UnableToQuery({}))
        const runtime = yield* Effect.provide(
          Effect.runtime<ReviewRequests.ReviewRequestQueries>(),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getPublishedReviewRequestByAPrereviewer }),
        )

        const actual = yield* Effect.promise(() =>
          _.requestReviewPublished({ preprint, user, locale })({
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(getPublishedReviewRequestByAPrereviewer).toHaveBeenCalledWith({
          requesterId: user.orcid,
          preprintId: preprintTitle.id,
        })
      }).pipe(EffectTest.run),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'when the user is not logged in',
    (preprint, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestQueries>()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPublished({ preprint, locale })({
            getPreprintTitle: shouldNotBeCalled,
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }),
        })
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestQueries, {})), EffectTest.run),
  )
})
