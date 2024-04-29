import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import type { Fetch } from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import { Status } from 'hyper-ts'
import * as _ from '../../src/prereview-coar-notify/get-recent-review-requests'
import { RecentReviewRequestsC } from '../../src/prereview-coar-notify/get-recent-review-requests'
import * as fc from './fc'

describe('getRecentReviewRequests', () => {
  test.prop([
    fc.origin(),
    fc
      .array(
        fc.record({
          timestamp: fc.instant(),
          preprint: fc
            .indeterminatePreprintIdWithDoi()
            .filter(id => !['biorxiv', 'medrxiv', 'zenodo', 'africarxiv'].includes(id.type)),
        }),
      )
      .chain(requests =>
        fc.tuple(
          fc.constant(requests),
          fc.fetchResponse({
            status: fc.constant(Status.OK),
            text: fc.constant(RecentReviewRequestsC.encode(requests)),
          }),
        ),
      ),
  ])('when a list is found', async (origin, [requests, response]) => {
    const fetch = jest.fn<Fetch>(_ => Promise.resolve(response))

    const result = await _.getRecentReviewRequests(origin.href)({
      fetch,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(result).toStrictEqual(E.right(requests))
    expect(fetch).toHaveBeenCalledWith(`${origin}requests`, expect.objectContaining({ method: 'GET' }))
  })

  describe('when the request fails', () => {
    test.prop([fc.origin(), fc.anything()])('with a network error', async (origin, reason) => {
      const result = await _.getRecentReviewRequests(origin.href)({
        fetch: () => Promise.reject(reason),
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(result).toStrictEqual(E.left('unavailable'))
    })

    test.prop([fc.origin(), fc.fetchResponse({ status: fc.statusCode().filter(status => status !== Status.OK) })])(
      'with an unexpected status',
      async (origin, response) => {
        const result = await _.getRecentReviewRequests(origin.href)({
          fetch: () => Promise.resolve(response),
          clock: SystemClock,
          logger: () => IO.of(undefined),
        })()

        expect(result).toStrictEqual(E.left('unavailable'))
      },
    )
  })
})
