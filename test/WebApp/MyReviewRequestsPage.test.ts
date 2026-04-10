import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as ReviewRequests from '../../src/ReviewRequests/index.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { LoggedInUser } from '../../src/user.ts'
import * as _ from '../../src/WebApp/MyReviewRequestsPage/index.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

describe('MyReviewRequestsPage', () => {
  test.prop([fc.supportedLocale(), fc.user(), fc.constant([])])(
    'when the requests can be loaded',
    (locale, user, reviewRequests) =>
      Effect.gen(function* () {
        const listForPrereviewer = jest.fn<(typeof ReviewRequests.ReviewRequests.Service)['listForPrereviewer']>(_ =>
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
      }).pipe(Effect.provide([Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)]), EffectTest.run),
  )

  test.prop([fc.supportedLocale(), fc.user()])("when the requests can't be loaded", (locale, user) =>
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
      EffectTest.run,
    ),
  )
})
