import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import * as _ from '../../src/request-review-flow'
import type { GetReviewRequestEnv } from '../../src/review-request'
import { requestReviewMatch, requestReviewStartMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReview', () => {
  describe('when the user is logged in', () => {
    describe('when reviews can be requested', () => {
      test.prop([fc.user()])("when a review hasn't been started", async user => {
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))

        const actual = await _.requestReview({ user })({
          canRequestReviews: () => true,
          getReviewRequest,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(requestReviewMatch.formatter, {}),
          status: Status.OK,
          title: expect.stringContaining('Request a PREreview'),
          main: expect.stringContaining('request a PREreview'),
          skipToLabel: 'main',
          js: [],
          allowRobots: false,
        })
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
      })

      test.prop([fc.user(), fc.reviewRequest()])('when a review has been started', async (user, reviewRequest) => {
        const actual = await _.requestReview({ user })({
          canRequestReviews: () => true,
          getReviewRequest: () => TE.right(reviewRequest),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(requestReviewStartMatch.formatter, {}),
        })
      })

      test.prop([fc.user()])("when a review can't be loaded", async user => {
        const actual = await _.requestReview({ user })({
          canRequestReviews: () => true,
          getReviewRequest: () => TE.left('unavailable'),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      })
    })

    test.prop([fc.user()])("when reviews can't be requested", async user => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

      const actual = await _.requestReview({ user })({
        canRequestReviews,
        getReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
      expect(canRequestReviews).toHaveBeenCalledWith(user)
    })
  })

  test('when the user is not logged in', async () => {
    const actual = await _.requestReview({})({
      canRequestReviews: shouldNotBeCalled,
      getReviewRequest: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestReviewMatch.formatter, {}),
    })
  })
})
