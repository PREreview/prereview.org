import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { CanRequestReviewsEnv } from '../../src/feature-flags.js'
import * as _ from '../../src/request-a-prereview-page/make-decision.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

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
          fc.reviewRequestPreprintId(),
        ])('when the form is valid', async (value, user, preprintId) => {
          const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
            resolvePreprintId: () => TE.of(preprintId),
          })()

          expect(actual).toStrictEqual({ _tag: 'BeginFlow', preprint: preprintId })
        })

        test.prop([
          fc.oneof(
            fc.preprintDoi(),
            fc.supportedPreprintUrl().map(([url]) => url.href),
          ),
          fc.user(),
          fc.notAReviewRequestPreprintId(),
        ])('when the preprint is not supported', async (value, user, preprintId) => {
          const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
            resolvePreprintId: () => TE.of(preprintId),
          })()

          expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedPreprint', preprint: preprintId })
        })

        test.prop([
          fc.oneof(
            fc.indeterminatePreprintIdWithDoi().map(id => [id.value, id] as const),
            fc.supportedPreprintUrl().map(([url, id]) => [url.href, id] as const),
          ),
          fc.user(),
        ])('when the preprint is not found', async ([value, preprint], user) => {
          const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
            resolvePreprintId: () => TE.left('not-found'),
          })()

          expect(actual).toStrictEqual({
            _tag: 'ShowUnknownPreprint',
            preprint: expect.objectContaining({ value: preprint.value }),
          })
        })

        test.prop([
          fc.oneof(
            fc.indeterminatePreprintIdWithDoi().map(id => id.value),
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

        test.prop([
          fc.oneof(
            fc.preprintDoi(),
            fc.supportedPreprintUrl().map(([url]) => url.href),
          ),
          fc.user(),
        ])("when the preprint can't be loaded", async (value, user) => {
          const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST', user })({
            canRequestReviews: () => true,
            resolvePreprintId: () => TE.left('unavailable'),
          })()

          expect(actual).toStrictEqual({ _tag: 'ShowError' })
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

          expect(actual).toStrictEqual({ _tag: 'ShowFormWithErrors', form: { _tag: 'InvalidForm', value } })
        })
      })

      test.prop([fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user()])(
        'when the form needs submitting',
        async (body, method, user) => {
          const actual = await _.makeDecision({ body, method, user })({
            canRequestReviews: () => true,
            resolvePreprintId: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({ _tag: 'ShowEmptyForm' })
        },
      )
    })

    test.prop([fc.anything(), fc.string(), fc.option(fc.user(), { nil: undefined })])(
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
})
