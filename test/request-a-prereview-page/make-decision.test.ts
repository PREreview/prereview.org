import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import * as _ from '../../src/request-a-prereview-page/make-decision'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('makeDecision', () => {
  describe('when the user is logged in', () => {
    describe('when reviews can be requested', () => {
      describe('when the form has been submitted', () => {
        test.prop([fc.oneof(fc.doi(), fc.webUrl()), fc.user()])('when the form is valid', (value, user) => {
          const actual = _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
          })

          expect(actual).toStrictEqual({ _tag: 'ShowError' })
        })

        test.prop([
          fc
            .string()
            .filter(
              string =>
                (!string.startsWith('10.') && !string.startsWith('http')) ||
                !string.includes('.') ||
                !string.includes('/'),
            ),
          fc.user(),
        ])('when the form is invalid', (value, user) => {
          const actual = _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
          })

          expect(actual).toStrictEqual({ _tag: 'ShowForm', form: { _tag: 'InvalidForm', value } })
        })
      })

      test.prop([fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user()])(
        'when the form needs submitting',
        (body, method, user) => {
          const actual = _.makeDecision({ body, method, user })({
            canRequestReviews: () => true,
          })

          expect(actual).toStrictEqual({ _tag: 'ShowForm', form: { _tag: 'UnsubmittedForm' } })
        },
      )
    })

    test.prop([fc.anything(), fc.string(), fc.user()])("when reviews can't be requested", (body, method, user) => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

      const actual = _.makeDecision({ body, method, user })({
        canRequestReviews,
      })

      expect(actual).toStrictEqual({ _tag: 'DenyAccess' })
      expect(canRequestReviews).toHaveBeenCalledWith(user)
    })
  })

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', (body, method) => {
    const actual = _.makeDecision({ body, method })({
      canRequestReviews: shouldNotBeCalled,
    })

    expect(actual).toStrictEqual({ _tag: 'RequireLogIn' })
  })
})
