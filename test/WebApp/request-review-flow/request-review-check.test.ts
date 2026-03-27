import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as Commands from '../../../src/Commands.ts'
import type { GetPreprintTitleEnv } from '../../../src/preprint.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as Routes from '../../../src/routes.ts'
import { requestReviewCheckMatch, requestReviewPersonaMatch, requestReviewPublishedMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { Temporal } from '../../../src/types/index.ts'
import * as _ from '../../../src/WebApp/request-review-flow/check-page/index.ts'
import { RedirectResponse } from '../../../src/WebApp/Response/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('requestReviewCheck', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      describe('when the form has been submitted', () => {
        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.record({ personaChoice: fc.constantFrom('public', 'pseudonym'), reviewRequestId: fc.uuid() }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.supportedLocale(),
        ])('when the request can be published', (preprint, user, reviewRequest, preprintTitle, locale) =>
          Effect.gen(function* () {
            const publishReviewRequest = jest.fn<
              (typeof ReviewRequests.ReviewRequestCommands.Service)['publishReviewRequest']
            >(_ => Effect.void)
            const runtime = yield* Effect.provide(
              Effect.runtime<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>(),
              Layer.mock(ReviewRequests.ReviewRequestCommands, { publishReviewRequest }),
            )

            const actual = yield* Effect.promise(() =>
              _.requestReviewCheck({
                method: 'POST',
                preprint,
                user,
                locale,
              })({
                getPreprintTitle: () => TE.right(preprintTitle),
                runtime,
              })(),
            )

            expect(actual).toStrictEqual(
              RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: preprintTitle.id }) }),
            )
            expect(publishReviewRequest).toHaveBeenCalledWith({
              publishedAt: yield* Temporal.currentInstant,
              reviewRequestId: reviewRequest.reviewRequestId,
            })
          }).pipe(
            Effect.provide(
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getReviewRequestReadyToBePublished: () => Effect.succeed(reviewRequest),
              }),
            ),
            EffectTest.run,
          ),
        )

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.record({ personaChoice: fc.constantFrom('public', 'pseudonym'), reviewRequestId: fc.uuid() }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.supportedLocale(),
        ])("when the request can't be published", (preprint, user, reviewRequest, preprintTitle, locale) =>
          Effect.gen(function* () {
            const publishReviewRequest = jest.fn<
              (typeof ReviewRequests.ReviewRequestCommands.Service)['publishReviewRequest']
            >(_ => new Commands.UnableToHandleCommand({}))
            const runtime = yield* Effect.provide(
              Effect.runtime<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>(),
              Layer.mock(ReviewRequests.ReviewRequestCommands, { publishReviewRequest }),
            )

            const actual = yield* Effect.promise(() =>
              _.requestReviewCheck({
                method: 'POST',
                preprint,
                user,
                locale,
              })({
                getPreprintTitle: () => TE.right(preprintTitle),
                runtime,
              })(),
            )

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              status: StatusCodes.ServiceUnavailable,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
            expect(publishReviewRequest).toHaveBeenCalledWith({
              publishedAt: yield* Temporal.currentInstant,
              reviewRequestId: reviewRequest.reviewRequestId,
            })
          }).pipe(
            Effect.provide(
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getReviewRequestReadyToBePublished: () => Effect.succeed(reviewRequest),
              }),
            ),
            EffectTest.run,
          ),
        )

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.record({ personaChoice: fc.constantFrom('public', 'pseudonym'), reviewRequestId: fc.uuid() }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.supportedLocale(),
          fc.anything().chain(cause =>
            fc.constantFrom(
              new Commands.UnableToHandleCommand({ cause }),
              new ReviewRequests.UnknownReviewRequest({ cause }),
              new ReviewRequests.ReviewRequestNotReadyToBePublished({
                missing: ['PersonaForAReviewRequestForAPreprintWasChosen'],
              }),
              new ReviewRequests.ReviewRequestHasBeenPublished({ cause }),
            ),
          ),
        ])('when the request can not be published', (preprint, user, reviewRequest, preprintTitle, locale, error) =>
          Effect.gen(function* () {
            const publishReviewRequest = jest.fn<
              (typeof ReviewRequests.ReviewRequestCommands.Service)['publishReviewRequest']
            >(_ => error)
            const runtime = yield* Effect.provide(
              Effect.runtime<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>(),
              Layer.mock(ReviewRequests.ReviewRequestCommands, { publishReviewRequest }),
            )

            const actual = yield* Effect.promise(() =>
              _.requestReviewCheck({
                method: 'POST',
                preprint,
                user,
                locale,
              })({
                getPreprintTitle: () => TE.right(preprintTitle),
                runtime,
              })(),
            )

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              status: StatusCodes.ServiceUnavailable,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
            expect(publishReviewRequest).toHaveBeenCalledWith({
              publishedAt: yield* Temporal.currentInstant,
              reviewRequestId: reviewRequest.reviewRequestId,
            })
          }).pipe(
            Effect.provide(
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getReviewRequestReadyToBePublished: () => Effect.succeed(reviewRequest),
              }),
            ),
            EffectTest.run,
          ),
        )
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.string().filter(method => method !== 'POST'),
        fc.user(),
        fc.record({ personaChoice: fc.constantFrom('public', 'pseudonym'), reviewRequestId: fc.uuid() }),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
      ])('when the form needs submitting', (preprint, method, user, reviewRequest, preprintTitle, locale) =>
        Effect.gen(function* () {
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))
          const runtime = yield* Effect.runtime<
            ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
          >()

          const actual = yield* Effect.promise(() =>
            _.requestReviewCheck({
              method,
              preprint,
              user,
              locale,
            })({
              getPreprintTitle,
              runtime,
            })(),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(requestReviewCheckMatch.formatter, { id: preprintTitle.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['single-use-form.js'],
          })
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
        }).pipe(
          Effect.provide([
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReviewRequestReadyToBePublished: () => Effect.succeed(reviewRequest),
            }),
          ]),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])('when the request is already complete', (preprint, method, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({
            method,
            preprint,
            user,
            locale,
          })({
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(requestReviewPublishedMatch.formatter, { id: preprint }),
        })
      }).pipe(
        Effect.provide([
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getReviewRequestReadyToBePublished: () => new ReviewRequests.ReviewRequestHasBeenPublished({}),
          }),
        ]),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when a name hasn't been chosen", (preprint, method, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({
            method,
            preprint,
            user,
            locale,
          })({
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(requestReviewPersonaMatch.formatter, { id: preprint }),
        })
      }).pipe(
        Effect.provide([
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getReviewRequestReadyToBePublished: () =>
              new ReviewRequests.ReviewRequestNotReadyToBePublished({
                missing: ['PersonaForAReviewRequestForAPreprintWasChosen'],
              }),
          }),
        ]),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when a request hasn't been started", (preprint, method, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const getReviewRequestReadyToBePublished = jest.fn<
          (typeof ReviewRequests.ReviewRequestQueries.Service)['getReviewRequestReadyToBePublished']
        >(_ => new ReviewRequests.UnknownReviewRequest({}))
        const runtime = yield* Effect.provide(
          Effect.runtime<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>(),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestReadyToBePublished }),
        )

        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({
            method,
            preprint,
            user,
            locale,
          })({
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
        expect(getReviewRequestReadyToBePublished).toHaveBeenCalledWith({
          requesterId: user.orcid,
          preprintId: preprintTitle.id,
        })
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when the request can't be loaded", (preprint, method, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const getReviewRequestReadyToBePublished = jest.fn<
          (typeof ReviewRequests.ReviewRequestQueries.Service)['getReviewRequestReadyToBePublished']
        >(_ => new Queries.UnableToQuery({}))
        const runtime = yield* Effect.provide(
          Effect.runtime<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>(),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestReadyToBePublished }),
        )

        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({
            method,
            preprint,
            user,
            locale,
          })({
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
        expect(getReviewRequestReadyToBePublished).toHaveBeenCalledWith({
          requesterId: user.orcid,
          preprintId: preprintTitle.id,
        })
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    (preprint, method, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({ method, preprint, locale })({
            getPreprintTitle: shouldNotBeCalled,
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }),
        })
      }).pipe(
        Effect.provide([
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
        ]),
        EffectTest.run,
      ),
  )
})
