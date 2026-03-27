import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetPreprintTitleEnv } from '../../../src/preprint.ts'
import type { GetReviewRequestEnv, SaveReviewRequestEnv } from '../../../src/review-request.ts'
import * as Routes from '../../../src/routes.ts'
import { requestReviewCheckMatch, requestReviewPersonaMatch, requestReviewPublishedMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
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
          fc.incompleteReviewRequest({ persona: fc.constantFrom('public', 'pseudonym') }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.supportedLocale(),
        ])('when the request can be published', (preprint, user, reviewRequest, preprintTitle, locale) =>
          Effect.gen(function* () {
            const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.right(undefined))
            const publishRequest = jest.fn<_.PublishRequestEnv['publishRequest']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(() =>
              _.requestReviewCheck({
                method: 'POST',
                preprint,
                user,
                locale,
              })({
                getPreprintTitle: () => TE.right(preprintTitle),
                getReviewRequest: () => TE.right(reviewRequest),
                publishRequest,
                saveReviewRequest,
              })(),
            )

            expect(actual).toStrictEqual(
              RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: preprintTitle.id }) }),
            )
            expect(publishRequest).toHaveBeenCalledWith(reviewRequest.id)
            expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never, {
              status: 'completed',
            })
          }).pipe(EffectTest.run),
        )

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest({ persona: fc.constantFrom('public', 'pseudonym') }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.supportedLocale(),
        ])("when the request state can't be changed", (preprint, user, reviewRequest, preprintTitle, locale) =>
          Effect.gen(function* () {
            const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.left('unavailable'))
            const publishRequest = jest.fn<_.PublishRequestEnv['publishRequest']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(() =>
              _.requestReviewCheck({
                method: 'POST',
                preprint,
                user,
                locale,
              })({
                getPreprintTitle: () => TE.right(preprintTitle),
                getReviewRequest: () => TE.right(reviewRequest),
                publishRequest,
                saveReviewRequest,
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
            expect(publishRequest).toHaveBeenCalledWith(reviewRequest.id)
            expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never, {
              status: 'completed',
            })
          }).pipe(EffectTest.run),
        )

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest({ persona: fc.constantFrom('public', 'pseudonym') }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.supportedLocale(),
        ])('when the request can not be published', (preprint, user, reviewRequest, preprintTitle, locale) =>
          Effect.gen(function* () {
            const publishRequest = jest.fn<_.PublishRequestEnv['publishRequest']>(_ => TE.left('unavailable'))

            const actual = yield* Effect.promise(() =>
              _.requestReviewCheck({
                method: 'POST',
                preprint,
                user,
                locale,
              })({
                getPreprintTitle: () => TE.right(preprintTitle),
                getReviewRequest: () => TE.right(reviewRequest),
                publishRequest,
                saveReviewRequest: shouldNotBeCalled,
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
            expect(publishRequest).toHaveBeenCalledWith(reviewRequest.id)
          }).pipe(EffectTest.run),
        )
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.string().filter(method => method !== 'POST'),
        fc.user(),
        fc.incompleteReviewRequest({ persona: fc.constantFrom('public', 'pseudonym') }),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
      ])('when the form needs submitting', (preprint, method, user, reviewRequest, preprintTitle, locale) =>
        Effect.gen(function* () {
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

          const actual = yield* Effect.promise(() =>
            _.requestReviewCheck({
              method,
              preprint,
              user,
              locale,
            })({
              getPreprintTitle,
              getReviewRequest: () => TE.right(reviewRequest),
              publishRequest: shouldNotBeCalled,
              saveReviewRequest: shouldNotBeCalled,
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
        }).pipe(EffectTest.run),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.completedReviewRequest(),
      fc.supportedLocale(),
    ])('when the request is already complete', (preprint, method, user, preprintTitle, reviewRequest, locale) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({
            method,
            preprint,
            user,
            locale,
          })({
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest: () => TE.right(reviewRequest),
            publishRequest: shouldNotBeCalled,
            saveReviewRequest: shouldNotBeCalled,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(requestReviewPublishedMatch.formatter, { id: preprint }),
        })
      }).pipe(EffectTest.run),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.incompleteReviewRequest({ persona: fc.constant(undefined) }),
      fc.supportedLocale(),
    ])("when a name hasn't been chosen", (preprint, method, user, preprintTitle, reviewRequest, locale) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({
            method,
            preprint,
            user,
            locale,
          })({
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest: () => TE.right(reviewRequest),
            publishRequest: shouldNotBeCalled,
            saveReviewRequest: shouldNotBeCalled,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(requestReviewPersonaMatch.formatter, { id: preprint }),
        })
      }).pipe(EffectTest.run),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when a request hasn't been started", (preprint, method, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))

        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({
            method,
            preprint,
            user,
            locale,
          })({
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest,
            publishRequest: shouldNotBeCalled,
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
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never)
      }).pipe(EffectTest.run),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when the request can't be loaded", (preprint, method, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('unavailable'))

        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({
            method,
            preprint,
            user,
            locale,
          })({
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest,
            publishRequest: shouldNotBeCalled,
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
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never)
      }).pipe(EffectTest.run),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    (preprint, method, locale) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(() =>
          _.requestReviewCheck({ method, preprint, locale })({
            getPreprintTitle: shouldNotBeCalled,
            getReviewRequest: shouldNotBeCalled,
            publishRequest: shouldNotBeCalled,
            saveReviewRequest: shouldNotBeCalled,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }),
        })
      }).pipe(EffectTest.run),
  )
})
