import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetPreprintTitleEnv } from '../../../src/preprint.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { requestReviewMatch, requestReviewStartMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/request-review-flow/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('requestReview', () => {
  describe('when the user is logged in', () => {
    describe("when a review hasn't been started", () => {
      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
      ])('when the preprint is supported', (preprint, user, preprintTitle, locale) =>
        Effect.gen(function* () {
          const findReviewRequestByAPrereviewer = jest.fn<
            (typeof ReviewRequests.ReviewRequestQueries.Service)['findReviewRequestByAPrereviewer']
          >(_ => Effect.succeedNone)
          const runtime = yield* Effect.provide(
            Effect.runtime<ReviewRequests.ReviewRequestQueries>(),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { findReviewRequestByAPrereviewer }),
          )
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

          const actual = yield* Effect.promise(() =>
            _.requestReview({ preprint, user, locale })({
              getPreprintTitle,
              runtime,
            })(),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(requestReviewMatch.formatter, { id: preprintTitle.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
            allowRobots: false,
          })
          expect(findReviewRequestByAPrereviewer).toHaveBeenCalledWith({
            requesterId: user.orcid,
            preprintId: preprintTitle.id,
          })
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
        }).pipe(EffectTest.run),
      )

      test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
        "when the preprint doesn't exist",
        (preprint, user, locale) =>
          Effect.gen(function* () {
            const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestQueries>()
            const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ =>
              TE.left(new PreprintIsNotFound({})),
            )

            const actual = yield* Effect.promise(() =>
              _.requestReview({ preprint, user, locale })({
                getPreprintTitle,
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
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
          }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestQueries, {})), EffectTest.run),
      )

      test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
        "when the preprint can't be loaded",
        async (preprint, user, locale) =>
          Effect.gen(function* () {
            const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestQueries>()
            const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ =>
              TE.left(new PreprintIsUnavailable({})),
            )

            const actual = yield* Effect.promise(() =>
              _.requestReview({ preprint, user, locale })({
                getPreprintTitle,
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
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
          }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestQueries, {})), EffectTest.run),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.uuid(),
      fc.supportedLocale(),
    ])('when a review has been started', async (preprint, user, preprintTitle, reviewRequest, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestQueries>()

        const actual = yield* Effect.promise(() =>
          _.requestReview({ preprint, user, locale })({
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(requestReviewStartMatch.formatter, { id: preprint }),
        })
      }).pipe(
        Effect.provide(
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            findReviewRequestByAPrereviewer: () => Effect.succeedSome(reviewRequest),
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
      fc.anything().map(cause => new Queries.UnableToQuery({ cause })),
    ])("when a review can't be loaded", (preprint, user, preprintTitle, locale, error) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestQueries>()

        const actual = yield* Effect.promise(() =>
          _.requestReview({ preprint, user, locale })({
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
      }).pipe(
        Effect.provide(
          Layer.mock(ReviewRequests.ReviewRequestQueries, { findReviewRequestByAPrereviewer: () => error }),
        ),
        EffectTest.run,
      ),
    )
  })
})
