import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/RequestAReviewOfThisPreprintPage/index.ts'
import * as fc from '../../fc.ts'

describe('requestReview', () => {
  describe('when the user is logged in', () => {
    describe("when a review hasn't been started", () => {
      it.effect.prop(
        'when the preprint is supported',
        [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
        ([preprintId, user, preprint, locale]) =>
          Effect.gen(function* () {
            const findReviewRequestByAPrereviewer = vi.fn<
              (typeof ReviewRequests.ReviewRequestQueries.Service)['findReviewRequestByAPrereviewer']
            >(_ => Effect.succeedNone)
            const getPreprintTitle = vi.fn<(typeof Preprints.Preprints.Service)['getPreprintTitle']>(_ =>
              Effect.succeed(preprint),
            )

            const actual = yield* Effect.provide(
              _.RequestAReviewOfThisPreprintPage({ preprintId }),
              Layer.mergeAll(
                Layer.mock(Preprints.Preprints, { getPreprintTitle }),
                Layer.mock(ReviewRequests.ReviewRequestQueries, { findReviewRequestByAPrereviewer }),
              ),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              canonical: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint.id }),
              status: StatusCodes.OK,
              title: expect.anything(),
              nav: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
              allowRobots: false,
            })
            expect(findReviewRequestByAPrereviewer).toHaveBeenCalledWith({ requesterId: user.orcid, preprintId })
            expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
          }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(LoggedInUser, user), Layer.succeed(Locale, locale)))),
      )

      it.effect.prop(
        "when the preprint doesn't exist",
        [fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
        ([preprintId, user, locale]) =>
          Effect.gen(function* () {
            const getPreprintTitle = vi.fn<(typeof Preprints.Preprints.Service)['getPreprintTitle']>(
              _ => new Preprints.PreprintIsNotFound({}),
            )

            const actual = yield* Effect.provide(
              _.RequestAReviewOfThisPreprintPage({ preprintId }),
              Layer.mock(Preprints.Preprints, { getPreprintTitle }),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: StatusCodes.NotFound,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
            expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
          }).pipe(
            Effect.provide(
              Layer.mergeAll(
                user ? Layer.succeed(LoggedInUser, user) : Layer.empty,
                Layer.succeed(Locale, locale),
                Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
              ),
            ),
          ),
      )

      it.effect.prop(
        "when the preprint can't be loaded",
        [fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
        ([preprintId, user, locale]) =>
          Effect.gen(function* () {
            const getPreprintTitle = vi.fn<(typeof Preprints.Preprints.Service)['getPreprintTitle']>(
              _ => new Preprints.PreprintIsUnavailable({}),
            )

            const actual = yield* Effect.provide(
              _.RequestAReviewOfThisPreprintPage({ preprintId }),
              Layer.mock(Preprints.Preprints, { getPreprintTitle }),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: StatusCodes.ServiceUnavailable,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
            expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
          }).pipe(
            Effect.provide(
              Layer.mergeAll(
                user ? Layer.succeed(LoggedInUser, user) : Layer.empty,
                Layer.succeed(Locale, locale),
                Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
              ),
            ),
          ),
      )
    })

    it.effect.prop(
      'when a review has been started',
      [
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle(),
        fc.record({
          _tag: fc.constantFrom('PublishedReviewRequest', 'ReviewRequestPendingPublication'),
          id: fc.uuid(),
        }),
        fc.supportedLocale(),
      ],
      ([preprintId, user, preprint, reviewRequest, locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.RequestAReviewOfThisPreprintPage({ preprintId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.RequestAReviewStartNow.href({ preprintId: preprint.id }),
          })
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.succeed(LoggedInUser, user),
              Layer.succeed(Locale, locale),
              Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprint) }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                findReviewRequestByAPrereviewer: () => Effect.succeedSome(reviewRequest),
              }),
            ),
          ),
        ),
    )

    it.effect.prop(
      "when a review can't be loaded",
      [
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
        fc.anything().map(cause => new Queries.UnableToQuery({ cause })),
      ],
      ([preprintId, user, preprint, locale, error]) =>
        Effect.gen(function* () {
          const actual = yield* _.RequestAReviewOfThisPreprintPage({ preprintId })

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
              Layer.succeed(LoggedInUser, user),
              Layer.succeed(Locale, locale),
              Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprint) }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                findReviewRequestByAPrereviewer: () => error,
              }),
            ),
          ),
        ),
    )
  })
})
