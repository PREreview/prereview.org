import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as Commands from '../../../src/Commands.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/request-review-flow/index.ts'
import type { SaveReviewRequestEnv } from '../../../src/review-request.ts'
import { requestReviewCheckMatch, requestReviewPublishedMatch, requestReviewStartMatch } from '../../../src/routes.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('requestReviewStart', () => {
  describe('when the user is logged in', () => {
    describe("when a request hasn't been started", () => {
      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
        fc.uuid(),
      ])('when a request can be started', (preprint, user, preprintTitle, locale, uuid) =>
        Effect.gen(function* () {
          const findReviewRequestByAPrereviewer = jest.fn<
            (typeof ReviewRequests.ReviewRequestQueries.Service)['findReviewRequestByAPrereviewer']
          >(_ => Effect.succeedNone)
          const runtime = yield* Effect.provide(
            Effect.runtime<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>(),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { findReviewRequestByAPrereviewer }),
          )
          const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(() =>
            _.requestReviewStart({ preprint, user, locale })({
              generateUuid: () => uuid,
              getPreprintTitle: () => TE.right(preprintTitle),
              runtime,
              saveReviewRequest,
            })(),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(requestReviewCheckMatch.formatter, { id: preprintTitle.id }),
          })
          expect(findReviewRequestByAPrereviewer).toHaveBeenCalledWith({
            requesterId: user.orcid,
            preprintId: preprintTitle.id,
          })
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never, {
            status: 'incomplete',
            id: uuid,
          })
        }).pipe(
          Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, { startReviewRequest: () => Effect.void })),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
        fc.uuid(),
        fc
          .anything()
          .chain(cause =>
            fc.constantFrom(
              new Commands.UnableToHandleCommand({ cause }),
              new ReviewRequests.ReviewRequestWasAlreadyStarted({ cause }),
            ),
          ),
      ])("when a request can't be started", (preprint, user, preprintTitle, locale, uuid, error) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<
            ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
          >()

          const actual = yield* Effect.promise(() =>
            _.requestReviewStart({ preprint, user, locale })({
              generateUuid: () => uuid,
              getPreprintTitle: () => TE.right(preprintTitle),
              runtime,
              saveReviewRequest: () => TE.right(undefined),
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
            Layer.mergeAll(
              Layer.mock(ReviewRequests.ReviewRequestCommands, { startReviewRequest: () => error }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                findReviewRequestByAPrereviewer: () => Effect.succeedNone,
              }),
            ),
          ),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.record({ _tag: fc.constant('PublishedReviewRequest'), id: fc.uuid() }),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])('when a request has already been completed', (preprint, user, reviewRequest, preprintTitle, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewStart({ preprint, user, locale })({
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
            saveReviewRequest: shouldNotBeCalled,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(requestReviewPublishedMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              findReviewRequestByAPrereviewer: () => Effect.succeedSome(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.record({ _tag: fc.constantFrom('ReviewRequestPendingPublication'), id: fc.uuid() }),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])('when a request has already been started', (preprint, user, reviewRequest, preprintTitle, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewStart({ preprint, user, locale })({
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
            saveReviewRequest: shouldNotBeCalled,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(requestReviewStartMatch.formatter, { id: preprintTitle.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              findReviewRequestByAPrereviewer: () => Effect.succeedSome(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'when the user is not logged in',
    (preprint, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewStart({ preprint, locale })({
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: shouldNotBeCalled,
            runtime,
            saveReviewRequest: shouldNotBeCalled,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(requestReviewStartMatch.formatter, { id: preprint }),
        })
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
          ),
        ),
        EffectTest.run,
      ),
  )
})
