import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import * as _ from '../../src/request-review-flow'
import { requestReviewMatch, requestReviewPublishedMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReviewPublished', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.user()])('when reviews can be requested', async user => {
      const actual = await _.requestReviewPublished({ user })({
        canRequestReviews: () => true,
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

    test.prop([fc.user()])("when reviews can't be requested", async user => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

      const actual = await _.requestReviewPublished({ user })({
        canRequestReviews,
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
    const actual = await _.requestReviewPublished({})({
      canRequestReviews: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestReviewMatch.formatter, {}),
    })
  })
})
