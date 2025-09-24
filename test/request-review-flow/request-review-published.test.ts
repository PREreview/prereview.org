import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/request-review-flow/index.ts'
import type { GetReviewRequestEnv } from '../../src/review-request.ts'
import { requestReviewMatch, requestReviewPublishedMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('requestReviewPublished', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.completedReviewRequest(),
      fc.supportedLocale(),
    ])('when the review has been completed', async (preprint, user, preprintTitle, reviewRequest, locale) => {
      const actual = await _.requestReviewPublished({ preprint, user, locale })({
        getReviewRequest: () => TE.right(reviewRequest),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(requestReviewPublishedMatch.formatter, { id: preprintTitle.id }),
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.either(fc.constant('not-found'), fc.incompleteReviewRequest()),
      fc.supportedLocale(),
    ])("when the review hasn't be completed", async (preprint, user, preprintTitle, reviewRequest, locale) => {
      const actual = await _.requestReviewPublished({ preprint, user, locale })({
        getReviewRequest: () => TE.fromEither(reviewRequest),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.supportedLocale(),
    ])("when the review can't be loaded", async (preprint, user, preprintTitle, locale) => {
      const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('unavailable'))

      const actual = await _.requestReviewPublished({ preprint, user, locale })({
        getReviewRequest,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id as never)
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (preprint, locale) => {
      const actual = await _.requestReviewPublished({ preprint, locale })({
        getReviewRequest: shouldNotBeCalled,
        getPreprintTitle: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(requestReviewMatch.formatter, { id: preprint }),
      })
    },
  )
})
