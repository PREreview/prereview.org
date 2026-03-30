import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/PublishedPage/index.ts'
import * as Routes from '../../../src/routes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('requestReviewPublished', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.uuid(),
      fc.supportedLocale(),
    ])('when the review has been completed', (preprintId, user, preprintTitle, reviewRequest, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishedPage({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.RequestAReviewPublished.href({ preprintId: preprintTitle.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPublishedReviewRequestByAPrereviewer: () => Effect.succeed(reviewRequest),
          }),
        ]),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when the review isn't found", (preprintId, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishedPage({ preprintId })

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
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPublishedReviewRequestByAPrereviewer: () => new ReviewRequests.UnknownReviewRequest({}),
          }),
        ]),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when the review can't be loaded", (preprintId, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const getPublishedReviewRequestByAPrereviewer = jest.fn<
          (typeof ReviewRequests.ReviewRequestQueries.Service)['getPublishedReviewRequestByAPrereviewer']
        >(_ => new Queries.UnableToQuery({}))

        const actual = yield* Effect.provide(
          _.PublishedPage({ preprintId }),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getPublishedReviewRequestByAPrereviewer }),
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
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
        ]),
        EffectTest.run,
      ),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'when the user is not logged in',
    (preprintId, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishedPage({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }),
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
        ]),
        EffectTest.run,
      ),
  )
})
