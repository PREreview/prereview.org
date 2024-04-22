import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import * as _ from '../../src/request-a-prereview-page/make-decision'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('makeDecision', () => {
  describe('when the user is logged in', () => {
    describe('when reviews can be requested', () => {
      test.prop([fc.user()])('when the form has been submitted', user => {
        const actual = _.makeDecision({ method: 'POST', user })({
          canRequestReviews: () => true,
        })

        expect(actual).toStrictEqual({ _tag: 'ShowError' })
      })

      test.prop([fc.string().filter(method => method !== 'POST'), fc.user()])(
        'when the form needs submitting',
        (method, user) => {
          const actual = _.makeDecision({ method, user })({
            canRequestReviews: () => true,
          })

          expect(actual).toStrictEqual({ _tag: 'ShowForm' })
        },
      )
    })

    test.prop([fc.string(), fc.user()])("when reviews can't be requested", (method, user) => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

      const actual = _.makeDecision({ method, user })({
        canRequestReviews,
      })

      expect(actual).toStrictEqual({ _tag: 'DenyAccess' })
      expect(canRequestReviews).toHaveBeenCalledWith(user)
    })
  })

  test.prop([fc.string()])('when the user is not logged in', method => {
    const actual = _.makeDecision({ method })({
      canRequestReviews: shouldNotBeCalled,
    })

    expect(actual).toStrictEqual({ _tag: 'RequireLogIn' })
  })
})
