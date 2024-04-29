import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { CanSeeReviewRequestsEnv } from '../../src/feature-flags'
import * as _ from '../../src/review-requests-page'
import { reviewRequestsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('reviewRequests', () => {
  describe('when the user is logged in', () => {
    describe('when the user can see review requests', () => {
      test.prop([
        fc.user(),
        fc.integer(),
        fc.record({
          currentPage: fc.integer(),
          totalPages: fc.integer(),
          reviewRequests: fc.nonEmptyArray(fc.record({ published: fc.plainDate(), preprint: fc.preprintTitle() })),
        }),
      ])('when the requests can be loaded', async (user, page, reviewRequests) => {
        const actual = await _.reviewRequests({ page, user })({
          canSeeReviewRequests: () => true,
          getReviewRequests: () => TE.right(reviewRequests),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(reviewRequestsMatch.formatter, { page: reviewRequests.currentPage }),
          status: Status.OK,
          title: expect.stringContaining('requests'),
          main: expect.stringContaining('requests'),
          skipToLabel: 'main',
          js: [],
        })
      })

      test.prop([fc.user(), fc.integer()])("when the requests can't be loaded", async (user, page) => {
        const getReviewRequests = jest.fn<_.GetReviewRequestsEnv['getReviewRequests']>(_ => TE.left('unavailable'))

        const actual = await _.reviewRequests({ page, user })({
          canSeeReviewRequests: () => true,
          getReviewRequests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
        expect(getReviewRequests).toHaveBeenCalledWith(page)
      })

      test.prop([fc.user(), fc.integer()])("when the requests can't be found", async (user, page) => {
        const getReviewRequests = jest.fn<_.GetReviewRequestsEnv['getReviewRequests']>(_ => TE.left('not-found'))

        const actual = await _.reviewRequests({ page, user })({
          canSeeReviewRequests: () => true,
          getReviewRequests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.NotFound,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
        expect(getReviewRequests).toHaveBeenCalledWith(page)
      })
    })

    test.prop([fc.user(), fc.integer()])("when the user can't see review requests", async (user, page) => {
      const canSeeReviewRequests = jest.fn<CanSeeReviewRequestsEnv['canSeeReviewRequests']>(_ => false)

      const actual = await _.reviewRequests({ page, user })({
        canSeeReviewRequests,
        getReviewRequests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
      expect(canSeeReviewRequests).toHaveBeenCalledWith(user)
    })
  })

  test.prop([fc.integer()])('when the user is not logged in', async page => {
    const actual = await _.reviewRequests({ page })({
      canSeeReviewRequests: shouldNotBeCalled,
      getReviewRequests: shouldNotBeCalled,
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
})