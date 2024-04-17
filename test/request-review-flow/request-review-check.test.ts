import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import * as _ from '../../src/request-review-flow'
import { RedirectResponse } from '../../src/response'
import { requestReviewCheckMatch, requestReviewMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReviewCheck', () => {
  describe('when the user is logged in', () => {
    describe('when reviews can be requested', () => {
      describe('when the form has been submitted', () => {
        test.prop([fc.user()])('when the request can be published', async user => {
          const actual = await _.requestReviewCheck({
            method: 'POST',
            user,
          })({
            canRequestReviews: () => true,
            publishRequest: () => TE.right(undefined),
          })()

          expect(actual).toStrictEqual(RedirectResponse({ location: '/' }))
        })

        test.prop([fc.user()])('when the request can not be published', async user => {
          const actual = await _.requestReviewCheck({
            method: 'POST',
            user,
          })({
            canRequestReviews: () => true,
            publishRequest: () => TE.left('unavailable'),
          })()

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            status: Status.ServiceUnavailable,
            title: expect.stringContaining('problems'),
            main: expect.stringContaining('unable to'),
            skipToLabel: 'main',
            js: [],
          })
        })
      })

      test.prop([fc.string().filter(method => method !== 'POST'), fc.user()])(
        'when the form needs submitting',
        async (method, user) => {
          const actual = await _.requestReviewCheck({
            method,
            user,
          })({
            canRequestReviews: () => true,
            publishRequest: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(requestReviewCheckMatch.formatter, {}),
            status: Status.OK,
            title: expect.stringContaining('Check your request'),
            main: expect.stringContaining('Check your request'),
            skipToLabel: 'form',
            js: ['single-use-form.js'],
          })
        },
      )
    })

    test.prop([fc.string(), fc.user()])("when reviews can't be requested", async (method, user) => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

      const actual = await _.requestReviewCheck({ method, user })({
        canRequestReviews,
        publishRequest: shouldNotBeCalled,
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

  test.prop([fc.string()])('when the user is not logged in', async method => {
    const actual = await _.requestReviewCheck({ method })({
      canRequestReviews: shouldNotBeCalled,
      publishRequest: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestReviewMatch.formatter, {}),
    })
  })
})
