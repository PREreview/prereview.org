import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import * as _ from '../../src/request-review-flow'
import { requestReviewStartMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReviewStart', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.user()])('when reviews can be requested', async user => {
      const actual = await _.requestReviewStart({ user })({
        canRequestReviews: () => true,
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

    test.prop([fc.user()])("when reviews can't be requested", async user => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

      const actual = await _.requestReviewStart({ user })({
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
    const actual = await _.requestReviewStart({})({
      canRequestReviews: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestReviewStartMatch.formatter, {}),
    })
  })
})
