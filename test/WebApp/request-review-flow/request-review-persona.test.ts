import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as Commands from '../../../src/Commands.ts'
import { PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/request-review-flow/persona-page/index.ts'
import type { GetPreprintTitleEnv } from '../../../src/preprint.ts'
import type { GetReviewRequestEnv, SaveReviewRequestEnv } from '../../../src/review-request.ts'
import {
  requestReviewCheckMatch,
  requestReviewMatch,
  requestReviewPersonaMatch,
  requestReviewPublishedMatch,
} from '../../../src/routes.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('requestReviewPersona', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      describe('when the form has been submitted', () => {
        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.constantFrom('public', 'pseudonym'),
          fc.supportedLocale(),
        ])('when the persona is set', async (preprint, user, reviewRequest, preprintTitle, persona, locale) =>
          Effect.gen(function* () {
            const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()
            const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))
            const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))
            const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(() =>
              _.requestReviewPersona({ body: { persona }, preprint, method: 'POST', user, locale })({
                getReviewRequest,
                getPreprintTitle,
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
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
            expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never, {
              ...reviewRequest,
              persona,
            })
          }).pipe(
            Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, { choosePersona: () => Effect.void })),
            EffectTest.run,
          ),
        )

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.constantFrom('public', 'pseudonym'),
          fc.supportedLocale(),
        ])("when the persona can't be set", async (preprint, user, reviewRequest, preprintTitle, persona, locale) =>
          Effect.gen(function* () {
            const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()
            const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.left('unavailable'))

            const actual = yield* Effect.promise(() =>
              _.requestReviewPersona({ body: { persona }, preprint, method: 'POST', user, locale })({
                getReviewRequest: () => TE.right(reviewRequest),
                getPreprintTitle: () => TE.right(preprintTitle),
                runtime,
                saveReviewRequest,
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
            expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never, {
              ...reviewRequest,
              persona,
            })
          }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
        )

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.constantFrom('public', 'pseudonym'),
          fc.supportedLocale(),
          fc
            .anything()
            .chain(cause =>
              fc.constantFrom(
                new Commands.UnableToHandleCommand({ cause }),
                new ReviewRequests.UnknownReviewRequest({ cause }),
              ),
            ),
        ])(
          "when the persona can't be set",
          async (preprint, user, reviewRequest, preprintTitle, persona, locale, error) =>
            Effect.gen(function* () {
              const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()

              const actual = yield* Effect.promise(() =>
                _.requestReviewPersona({ body: { persona }, preprint, method: 'POST', user, locale })({
                  getReviewRequest: () => TE.right(reviewRequest),
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
              Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, { choosePersona: () => error })),
              EffectTest.run,
            ),
        )
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.incompleteReviewRequest(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.anything(),
        fc.supportedLocale(),
      ])('when the form is invalid', async (preprint, user, reviewRequest, preprintTitle, body, locale) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()

          const actual = yield* Effect.promise(() =>
            _.requestReviewPersona({ body, preprint, method: 'POST', user, locale })({
              getReviewRequest: () => TE.right(reviewRequest),
              getPreprintTitle: () => TE.right(preprintTitle),
              runtime,
              saveReviewRequest: shouldNotBeCalled,
            })(),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(requestReviewPersonaMatch.formatter, { id: preprintTitle.id }),
            status: StatusCodes.BadRequest,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['error-summary.js'],
          })
        }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
      )

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.incompleteReviewRequest(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.string().filter(method => method !== 'POST'),
        fc.anything(),
        fc.supportedLocale(),
      ])('when the form needs submitting', async (preprint, user, reviewRequest, preprintTitle, method, body, locale) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()
          const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

          const actual = yield* Effect.promise(() =>
            _.requestReviewPersona({ body, preprint, method, user, locale })({
              getReviewRequest,
              getPreprintTitle,
              runtime,
              saveReviewRequest: shouldNotBeCalled,
            })(),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(requestReviewPersonaMatch.formatter, { id: preprintTitle.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: [],
          })
          expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never)
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
        }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.completedReviewRequest(),
      fc.string(),
      fc.anything(),
      fc.supportedLocale(),
    ])(
      'when the request is already complete',
      async (preprint, user, preprintTitle, reviewRequest, method, body, locale) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()

          const actual = yield* Effect.promise(() =>
            _.requestReviewPersona({ body, preprint, method, user, locale })({
              getReviewRequest: () => TE.right(reviewRequest),
              getPreprintTitle: () => TE.right(preprintTitle),
              runtime,
              saveReviewRequest: shouldNotBeCalled,
            })(),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(requestReviewPublishedMatch.formatter, { id: preprint }),
          })
        }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.string(),
      fc.anything(),
      fc.supportedLocale(),
    ])("when a request hasn't been started", async (preprint, user, preprintTitle, method, body, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPersona({ body, preprint, method, user, locale })({
            getReviewRequest: () => TE.left('not-found'),
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
            saveReviewRequest: shouldNotBeCalled,
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
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
    )
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.user(),
    fc.preprintTitle({ id: fc.preprintId() }),
    fc.string(),
    fc.anything(),
    fc.supportedLocale(),
  ])('when the request cannot be loaded', async (preprint, user, preprintTitle, method, body, locale) =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()

      const actual = yield* Effect.promise(() =>
        _.requestReviewPersona({ body, preprint, method, user, locale })({
          getReviewRequest: () => TE.left('unavailable'),
          getPreprintTitle: () => TE.right(preprintTitle),
          runtime,
          saveReviewRequest: shouldNotBeCalled,
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
    }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
  )

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.string(), fc.anything(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprint, user, method, body, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPersona({ body, preprint, method, user, locale })({
            getReviewRequest: () => shouldNotBeCalled,
            getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
            runtime,
            saveReviewRequest: shouldNotBeCalled,
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
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
  )

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.anything(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (preprint, method, body, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ReviewRequests.ReviewRequestCommands>()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPersona({ body, preprint, method, locale })({
            getReviewRequest: shouldNotBeCalled,
            getPreprintTitle: shouldNotBeCalled,
            runtime,
            saveReviewRequest: shouldNotBeCalled,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(requestReviewMatch.formatter, { id: preprint }),
        })
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {})), EffectTest.run),
  )
})
