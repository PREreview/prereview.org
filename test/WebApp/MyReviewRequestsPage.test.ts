import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as ReviewRequests from '../../src/ReviewRequests/index.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { LoggedInUser } from '../../src/user.ts'
import * as _ from '../../src/WebApp/MyReviewRequestsPage/index.ts'
import * as fc from '../fc.ts'

describe('MyReviewRequestsPage', () => {
  it.effect.prop(
    'when the requests can be loaded',
    [fc.supportedLocale(), fc.user(), fc.constant([])],
    ([locale, user, reviewRequests]) =>
      Effect.gen(function* () {
        const listForPrereviewer = vi.fn<(typeof ReviewRequests.ReviewRequests.Service)['listForPrereviewer']>(_ =>
          Effect.succeed(reviewRequests),
        )

        const actual = yield* Effect.provide(
          _.MyReviewRequestsPage,
          Layer.mock(ReviewRequests.ReviewRequests, { listForPrereviewer }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.MyReviewRequests,
          current: 'my-review-requests',
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(listForPrereviewer).toHaveBeenCalledWith(user.orcid)
      }).pipe(Effect.provide([Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)])),
  )

  it.effect.prop("when the requests can't be loaded", [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* _.MyReviewRequestsPage

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
        Layer.mock(ReviewRequests.ReviewRequests, {
          listForPrereviewer: () => new ReviewRequests.ReviewRequestsAreUnavailable({}),
        }),
      ]),
    ),
  )
})
