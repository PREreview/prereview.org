import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as Commands from '../../../src/Commands.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/request-review-flow/index.ts'
import type { GetReviewRequestEnv, SaveReviewRequestEnv } from '../../../src/review-request.ts'
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
          const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()
          const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))
          const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(() =>
            _.requestReviewStart({ preprint, user, locale })({
              generateUuid: () => uuid,
              getPreprintTitle: () => TE.right(preprintTitle),
              getReviewRequest,
              runtime,
              saveReviewRequest,
            })(),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(requestReviewCheckMatch.formatter, { id: preprintTitle.id }),
          })
          expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never)
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
          const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()

          const actual = yield* Effect.promise(() =>
            _.requestReviewStart({ preprint, user, locale })({
              generateUuid: () => uuid,
              getPreprintTitle: () => TE.right(preprintTitle),
              getReviewRequest: () => TE.left('not-found'),
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
          Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, { startReviewRequest: () => error })),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.completedReviewRequest(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])('when a request has already been completed', (preprint, user, reviewRequest, preprintTitle, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))

        const actual = yield* Effect.promise(() =>
          _.requestReviewStart({ preprint, user, locale })({
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest,
            runtime,
            saveReviewRequest: shouldNotBeCalled,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(requestReviewPublishedMatch.formatter, { id: preprintTitle.id }),
        })
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never)
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.incompleteReviewRequest(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])('when a request has already been started', (preprint, user, reviewRequest, preprintTitle, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))

        const actual = yield* Effect.promise(() =>
          _.requestReviewStart({ preprint, user, locale })({
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest,
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
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never)
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'when the user is not logged in',
    (preprint, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()

        const actual = yield* Effect.promise(() =>
          _.requestReviewStart({ preprint, locale })({
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: shouldNotBeCalled,
            getReviewRequest: shouldNotBeCalled,
            runtime,
            saveReviewRequest: shouldNotBeCalled,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(requestReviewStartMatch.formatter, { id: preprint }),
        })
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
  )
})
