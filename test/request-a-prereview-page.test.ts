import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../src/feature-flags'
import * as _ from '../src/request-a-prereview-page'
import { requestAPrereviewMatch } from '../src/routes'
import * as fc from './fc'
import { shouldNotBeCalled } from './should-not-be-called'

describe('requestAPrereview', () => {
  describe('when the user is logged in', () => {
    describe('when reviews can be requested', () => {
      test.prop([fc.user()])('when the form has been submitted', user => {
        const actual = _.requestAPrereview({ method: 'POST', user })({
          canRequestReviews: () => true,
        })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      })

      test.prop([fc.string().filter(method => method !== 'POST'), fc.user()])(
        'when the form needs submitting',
        (method, user) => {
          const actual = _.requestAPrereview({ method, user })({
            canRequestReviews: () => true,
          })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(requestAPrereviewMatch.formatter, {}),
            status: Status.OK,
            title: expect.stringContaining('Which preprint'),
            main: expect.stringContaining('Which preprint'),
            skipToLabel: 'form',
            js: [],
          })
        },
      )
    })

    test.prop([fc.string(), fc.user()])("when reviews can't be requested", (method, user) => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

      const actual = _.requestAPrereview({ method, user })({
        canRequestReviews,
      })

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

  test.prop([fc.string()])('when the user is not logged in', method => {
    const actual = _.requestAPrereview({ method })({
      canRequestReviews: shouldNotBeCalled,
    })

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestAPrereviewMatch.formatter, {}),
    })
  })
})
