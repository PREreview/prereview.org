import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as Commands from '../../../src/Commands.ts'
import { PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/request-review-flow/persona-page/index.ts'
import type { GetPreprintTitleEnv } from '../../../src/preprint.ts'
import * as Routes from '../../../src/routes.ts'
import { requestReviewCheckMatch, requestReviewPersonaMatch, requestReviewPublishedMatch } from '../../../src/routes.ts'
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
          fc.record({
            reviewRequestId: fc.uuid(),
            personaChoice: fc.maybe(fc.constantFrom('public', 'pseudonym')),
          }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.constantFrom('public', 'pseudonym'),
          fc.supportedLocale(),
        ])('when the persona is set', async (preprint, user, reviewRequest, preprintTitle, persona, locale) =>
          Effect.gen(function* () {
            const getPersonaChoice = jest.fn<(typeof ReviewRequests.ReviewRequestQueries.Service)['getPersonaChoice']>(
              _ => Effect.succeed(reviewRequest),
            )
            const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))
            const choosePersona = jest.fn<(typeof ReviewRequests.ReviewRequestCommands.Service)['choosePersona']>(
              _ => Effect.void,
            )
            const runtime = yield* Effect.provide(
              Effect.runtime<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>(),
              [
                Layer.mock(ReviewRequests.ReviewRequestQueries, { getPersonaChoice }),
                Layer.mock(ReviewRequests.ReviewRequestCommands, { choosePersona }),
              ],
            )

            const actual = yield* Effect.promise(() =>
              _.requestReviewPersona({ body: { persona }, preprint, method: 'POST', user, locale })({
                getPreprintTitle,
                runtime,
              })(),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(requestReviewCheckMatch.formatter, { id: preprintTitle.id }),
            })
            expect(getPersonaChoice).toHaveBeenCalledWith({ requesterId: user.orcid, preprintId: preprintTitle.id })
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
            expect(choosePersona).toHaveBeenCalledWith({ persona, reviewRequestId: reviewRequest.reviewRequestId })
          }).pipe(EffectTest.run),
        )

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.record({
            reviewRequestId: fc.uuid(),
            personaChoice: fc.maybe(fc.constantFrom('public', 'pseudonym')),
          }),
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
              const runtime = yield* Effect.runtime<
                ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
              >()

              const actual = yield* Effect.promise(() =>
                _.requestReviewPersona({ body: { persona }, preprint, method: 'POST', user, locale })({
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
              Effect.provide([
                Layer.mock(ReviewRequests.ReviewRequestCommands, { choosePersona: () => error }),
                Layer.mock(ReviewRequests.ReviewRequestQueries, {
                  getPersonaChoice: () => Effect.succeed(reviewRequest),
                }),
              ]),
              EffectTest.run,
            ),
        )
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.record({
          reviewRequestId: fc.uuid(),
          personaChoice: fc.maybe(fc.constantFrom('public', 'pseudonym')),
        }),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.anything(),
        fc.supportedLocale(),
      ])('when the form is invalid', async (preprint, user, reviewRequest, preprintTitle, body, locale) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<
            ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
          >()

          const actual = yield* Effect.promise(() =>
            _.requestReviewPersona({ body, preprint, method: 'POST', user, locale })({
              getPreprintTitle: () => TE.right(preprintTitle),
              runtime,
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
        }).pipe(
          Effect.provide([
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { getPersonaChoice: () => Effect.succeed(reviewRequest) }),
          ]),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.record({
          reviewRequestId: fc.uuid(),
          personaChoice: fc.maybe(fc.constantFrom('public', 'pseudonym')),
        }),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.string().filter(method => method !== 'POST'),
        fc.anything(),
        fc.supportedLocale(),
      ])('when the form needs submitting', async (preprint, user, reviewRequest, preprintTitle, method, body, locale) =>
        Effect.gen(function* () {
          const getPersonaChoice = jest.fn<(typeof ReviewRequests.ReviewRequestQueries.Service)['getPersonaChoice']>(
            _ => Effect.succeed(reviewRequest),
          )
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))
          const runtime = yield* Effect.provide(
            Effect.runtime<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>(),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { getPersonaChoice }),
          )

          const actual = yield* Effect.promise(() =>
            _.requestReviewPersona({ body, preprint, method, user, locale })({
              getPreprintTitle,
              runtime,
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
          expect(getPersonaChoice).toHaveBeenCalledWith({ requesterId: user.orcid, preprintId: preprintTitle.id })
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
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
    ])('when the request is already complete', async (preprint, user, preprintTitle, method, body, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPersona({ body, preprint, method, user, locale })({
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
            getPersonaChoice: () => new ReviewRequests.ReviewRequestHasBeenPublished({}),
          }),
        ]),
        EffectTest.run,
      ),
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
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPersona({ body, preprint, method, user, locale })({
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
      }).pipe(
        Effect.provide([
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPersonaChoice: () => new ReviewRequests.UnknownReviewRequest({}),
          }),
        ]),
        EffectTest.run,
      ),
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
      const runtime = yield* Effect.runtime<
        ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
      >()

      const actual = yield* Effect.promise(() =>
        _.requestReviewPersona({ body, preprint, method, user, locale })({
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
      Effect.provide([
        Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
        Layer.mock(ReviewRequests.ReviewRequestQueries, { getPersonaChoice: () => new Queries.UnableToQuery({}) }),
      ]),
      EffectTest.run,
    ),
  )

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.string(), fc.anything(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprint, user, method, body, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPersona({ body, preprint, method, user, locale })({
            getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
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
        Effect.provide([
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
        ]),
        EffectTest.run,
      ),
  )

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.anything(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (preprint, method, body, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries
        >()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPersona({ body, preprint, method, locale })({
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
