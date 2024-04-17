import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../../src/prereview-coar-notify/send-review-action-offer'
import * as fc from './fc'

describe('sendReviewActionOffer', () => {
  test.prop([fc.coarReviewActionOfferPayload(), fc.fetchResponse({ status: fc.constant(Status.Created) })])(
    'publishing succeeds',
    async (payload, response) => {
      const result = await _.sendReviewActionOffer(payload)({
        fetch: () => Promise.resolve(response),
      })()

      expect(result).toStrictEqual(E.right(undefined))
    },
  )

  describe('publishing fails', () => {
    test.prop([fc.coarReviewActionOfferPayload(), fc.anything()])('with a network error', async (payload, reason) => {
      const result = await _.sendReviewActionOffer(payload)({
        fetch: () => Promise.reject(reason),
      })()

      expect(result).toStrictEqual(E.left('unavailable'))
    })

    test.prop([
      fc.coarReviewActionOfferPayload(),
      fc.fetchResponse({ status: fc.statusCode().filter(status => status !== Status.Created) }),
    ])('with an unexpected status', async (payload, response) => {
      const result = await _.sendReviewActionOffer(payload)({
        fetch: () => Promise.resolve(response),
      })()

      expect(result).toStrictEqual(E.left('unavailable'))
    })
  })
})
