import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as T from 'fp-ts/Task'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv, CanSeeReviewRequestsEnv } from '../src/feature-flags'
import * as _ from '../src/home'
import { homeMatch } from '../src/routes'
import * as fc from './fc'
import { shouldNotBeCalled } from './should-not-be-called'

describe('home', () => {
  test.prop([fc.user(), fc.boolean(), fc.boolean()])(
    'when the user is logged in',
    async (user, canUserRequestReviews, canUserSeeRequests) => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => canUserRequestReviews)
      const canSeeReviewRequests = jest.fn<CanSeeReviewRequestsEnv['canSeeReviewRequests']>(_ => canUserSeeRequests)

      const actual = await _.home({ user })({
        getRecentPrereviews: () => T.of([]),
        canRequestReviews,
        canSeeReviewRequests,
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

  test('when the user is not logged in', async () => {
    const actual = await _.home({})({
      getRecentPrereviews: () => T.of([]),
      canRequestReviews: shouldNotBeCalled,
      canSeeReviewRequests: shouldNotBeCalled,
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
