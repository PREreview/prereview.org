import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/request-review-flow'
import type { GetReviewRequestEnv } from '../../src/review-request'
import { requestReviewMatch, requestReviewPublishedMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReviewPublished', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.completedReviewRequest(),
    ])('when the review has been completed', async (preprint, user, preprintTitle, reviewRequest) => {
      const actual = await _.requestReviewPublished({ preprint, user })({
        getReviewRequest: () => TE.right(reviewRequest),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(requestReviewPublishedMatch.formatter, {}),
        status: Status.OK,
        title: expect.stringContaining('Request published'),
        main: expect.stringContaining('Request published'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.either(fc.constant('not-found'), fc.incompleteReviewRequest()),
    ])("when the review hasn't be completed", async (preprint, user, preprintTitle, reviewRequest) => {
      const actual = await _.requestReviewPublished({ preprint, user })({
        getReviewRequest: () => TE.fromEither(reviewRequest),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.reviewRequestPreprintId() })])(
      "when the review can't be loaded",
      async (preprint, user, preprintTitle) => {
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('unavailable'))

        const actual = await _.requestReviewPublished({ preprint, user })({
          getReviewRequest,
          getPreprintTitle: () => TE.right(preprintTitle),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id)
      },
    )
  })

  test.prop([fc.indeterminatePreprintId()])('when the user is not logged in', async preprint => {
    const actual = await _.requestReviewPublished({ preprint })({
      getReviewRequest: shouldNotBeCalled,
      getPreprintTitle: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestReviewMatch.formatter, {}),
    })
  })
})
