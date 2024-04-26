import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as T from 'fp-ts/Task'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv, CanSeeReviewRequestsEnv } from '../../src/feature-flags'
import * as _ from '../../src/home-page'
import { homeMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('home', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.user(), fc.boolean()])(
      'when the user can see review requests',
      async (user, canUserRequestReviews) => {
        const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => canUserRequestReviews)
        const canSeeReviewRequests = jest.fn<CanSeeReviewRequestsEnv['canSeeReviewRequests']>(_ => true)

        const actual = await _.home({ user })({
          getRecentPrereviews: () => T.of([]),
          canRequestReviews,
          canSeeReviewRequests,
          getRecentReviewRequests: () => T.of([]),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(homeMatch.formatter, {}),
          current: 'home',
          status: Status.OK,
          title: expect.stringContaining('PREreview'),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(canRequestReviews).toHaveBeenCalledWith(user)
        expect(canSeeReviewRequests).toHaveBeenCalledWith(user)
      },
    )

    test.prop([fc.user(), fc.boolean()])(
      "when the user can't see review requests",
      async (user, canUserRequestReviews) => {
        const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => canUserRequestReviews)
        const canSeeReviewRequests = jest.fn<CanSeeReviewRequestsEnv['canSeeReviewRequests']>(_ => false)

        const actual = await _.home({ user })({
          getRecentPrereviews: () => T.of([]),
          canRequestReviews,
          canSeeReviewRequests,
          getRecentReviewRequests: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(homeMatch.formatter, {}),
          current: 'home',
          status: Status.OK,
          title: expect.stringContaining('PREreview'),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(canRequestReviews).toHaveBeenCalledWith(user)
        expect(canSeeReviewRequests).toHaveBeenCalledWith(user)
      },
    )
  })

  test('when the user is not logged in', async () => {
    const actual = await _.home({})({
      getRecentPrereviews: () => T.of([]),
      canRequestReviews: shouldNotBeCalled,
      canSeeReviewRequests: shouldNotBeCalled,
      getRecentReviewRequests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(homeMatch.formatter, {}),
      current: 'home',
      status: Status.OK,
      title: expect.stringContaining('PREreview'),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})
