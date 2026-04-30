import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/PublishedPage/index.ts'
import * as Routes from '../../../src/routes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as fc from '../../fc.ts'

describe('requestReviewPublished', () => {
  describe('when the user is logged in', () => {
    it.effect.prop(
      'when the review has been completed',
      [
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.uuid(),
        fc.supportedLocale(),
      ],
      ([preprintId, user, preprintTitle, reviewRequest, locale]) =>
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
        ),
    )

    it.effect.prop(
      "when the review isn't found",
      [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
      ([preprintId, user, preprintTitle, locale]) =>
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
        ),
    )

    it.effect.prop(
      "when the review can't be loaded",
      [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
      ([preprintId, user, preprintTitle, locale]) =>
        Effect.gen(function* () {
          const getPublishedReviewRequestByAPrereviewer = vi.fn<
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
        ),
    )
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.indeterminatePreprintId(), fc.supportedLocale()],
    ([preprintId, locale]) =>
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
      ),
  )
})
