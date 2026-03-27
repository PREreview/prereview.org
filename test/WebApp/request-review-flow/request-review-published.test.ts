import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/request-review-flow/index.ts'
import type { GetReviewRequestEnv } from '../../../src/review-request.ts'
import * as Routes from '../../../src/routes.ts'
import { requestReviewPublishedMatch } from '../../../src/routes.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('requestReviewPublished', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.completedReviewRequest(),
      fc.supportedLocale(),
    ])('when the review has been completed', (preprint, user, preprintTitle, reviewRequest, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPublished({ preprint, user, locale })({
            getReviewRequest: () => TE.right(reviewRequest),
            getPreprintTitle: () => TE.right(preprintTitle),
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(requestReviewPublishedMatch.formatter, { id: preprintTitle.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(EffectTest.run),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.either(fc.constant('not-found'), fc.incompleteReviewRequest()),
      fc.supportedLocale(),
    ])("when the review hasn't be completed", (preprint, user, preprintTitle, reviewRequest, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPublished({ preprint, user, locale })({
            getReviewRequest: () => TE.fromEither(reviewRequest),
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
      }).pipe(EffectTest.run),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when the review can't be loaded", (preprint, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('unavailable'))
        const runtime = yield* Effect.runtime()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPublished({ preprint, user, locale })({
            getReviewRequest,
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
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never)
      }).pipe(EffectTest.run),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'when the user is not logged in',
    (preprint, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime()

        const actual = yield* Effect.promise(() =>
          _.requestReviewPublished({ preprint, locale })({
            getReviewRequest: shouldNotBeCalled,
            getPreprintTitle: shouldNotBeCalled,
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }),
        })
      }).pipe(EffectTest.run),
  )
})
