import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as TE from 'fp-ts/TaskEither'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import * as _ from '../../src/request-a-prereview-page/make-decision'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('makeDecision', () => {
  describe('when the user is logged in', () => {
    describe('when reviews can be requested', () => {
      describe('when the form has been submitted', () => {
        test.prop([
          fc.oneof(
            fc.preprintDoi(),
            fc.supportedPreprintUrl().map(([url]) => url.href),
          ),
          fc.user(),
          fc.either(fc.constantFrom('not-found', 'unavailable'), fc.preprintId()),
        ])('when the form is valid', async (value, user, preprintId) => {
          const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
            resolvePreprintId: () => TE.fromEither(preprintId),
          })()

          expect(actual).toStrictEqual({ _tag: 'ShowError' })
        })

        test.prop([
          fc.oneof(
            fc.preprintDoi(),
            fc.supportedPreprintUrl().map(([url]) => url.href),
          ),
          fc.user(),
        ])('when it is not a preprint', async (value, user) => {
          const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
            resolvePreprintId: () => TE.left('not-a-preprint'),
          })()

          expect(actual).toStrictEqual({ _tag: 'ShowNotAPreprint' })
        })

        test.prop([fc.nonPreprintDoi(), fc.user()])('when it is not a supported DOI', async (value, user) => {
          const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
            resolvePreprintId: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedDoi' })
        })

        test.prop([fc.nonPreprintUrl().map(url => url.href), fc.user()])(
          'when it is not a supported URL',
          async (value, user) => {
            const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
              canRequestReviews: () => true,
              resolvePreprintId: shouldNotBeCalled,
            })()

            expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedUrl' })
          },
        )

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
        ])('when the form is invalid', async (value, user) => {
          const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
            resolvePreprintId: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({ _tag: 'ShowForm', form: { _tag: 'InvalidForm', value } })
        })
      })

      test.prop([fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user()])(
        'when the form needs submitting',
        async (body, method, user) => {
          const actual = await _.makeDecision({ body, method, user })({
            canRequestReviews: () => true,
            resolvePreprintId: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({ _tag: 'ShowForm', form: { _tag: 'UnsubmittedForm' } })
        },
      )
    })

    test.prop([fc.anything(), fc.string(), fc.user()])(
      "when reviews can't be requested",
      async (body, method, user) => {
        const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

        const actual = await _.makeDecision({ body, method, user })({
          canRequestReviews,
          resolvePreprintId: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({ _tag: 'DenyAccess' })
        expect(canRequestReviews).toHaveBeenCalledWith(user)
      },
    )
  })

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.makeDecision({ body, method })({
      canRequestReviews: shouldNotBeCalled,
      resolvePreprintId: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({ _tag: 'RequireLogIn' })
  })
})
