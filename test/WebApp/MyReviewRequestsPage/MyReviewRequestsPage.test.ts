import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/MyReviewRequestsPage/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('MyReviewRequestsPage', () => {
  test.prop([
    fc.user(),
    fc.supportedLocale(),
    fc.array(
      fc.record({
        firstRequested: fc.instant(),
        lastRequested: fc.instant(),
        preprintId: fc.indeterminatePreprintId(),
        matchingKeywords: fc.nonEmptyArray(fc.keywordId()),
      }),
    ),
    fc.preprintTitle(),
  ])('when the list can be loaded', (user, locale, results, preprint) =>
    Effect.gen(function* () {
      const actual = yield* _.MyReviewRequestsPage

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.MyReviewRequests,
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprint) }),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: () => Effect.succeed(results),
          }),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.user(),
    fc.supportedLocale(),
    fc.nonEmptyArray(
      fc.record({
        firstRequested: fc.instant(),
        lastRequested: fc.instant(),
        preprintId: fc.indeterminatePreprintId(),
        matchingKeywords: fc.nonEmptyArray(fc.keywordId()),
      }),
    ),
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(new Preprints.PreprintIsNotFound({ cause }), new Preprints.PreprintIsUnavailable({ cause })),
      ),
  ])("when a preprint can't be loaded", (user, locale, results, error) =>
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
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => error }),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: () => Effect.succeed(results),
          }),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([fc.user(), fc.supportedLocale(), fc.anything().map(cause => new ReviewRequests.UnableToQuery({ cause }))])(
    "when the results can't be loaded",
    (user, locale, error) =>
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
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(Preprints.Preprints, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: () => error,
            }),
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ),
        ),
        EffectTest.run,
      ),
  )
})
