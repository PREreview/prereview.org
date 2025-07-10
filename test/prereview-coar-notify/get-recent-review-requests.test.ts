import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import type { Fetch } from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import { Status } from 'hyper-ts'
import * as _ from '../../src/prereview-coar-notify/get-recent-review-requests.js'
import { RecentReviewRequestsC } from '../../src/prereview-coar-notify/get-recent-review-requests.js'
import { RecentReviewRequestsAreUnavailable } from '../../src/review-requests-page/review-requests.js'
import * as fc from './fc.js'

describe('getRecentReviewRequests', () => {
  test.prop([
    fc.origin(),
    fc
      .array(
        fc.record({
          timestamp: fc.instant(),
          preprint: fc
            .indeterminatePreprintIdWithDoi()
            .filter(
              id => !['biorxiv', 'medrxiv', 'osf', 'lifecycle-journal', 'zenodo', 'africarxiv'].includes(id._tag),
            ),
          fields: fc.array(fc.fieldId()),
          subfields: fc.array(fc.subfieldId()),
          language: fc.languageCode(),
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
    const fetch = jest.fn<Fetch>(_ => Promise.resolve(response.clone()))

    const result = await _.getRecentReviewRequests(origin)({
      fetch,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(result).toStrictEqual(E.right(requests))
    expect(fetch).toHaveBeenCalledWith(`${origin}requests`, expect.objectContaining({ method: 'GET' }))
  })

  describe('when the request fails', () => {
    test.prop([fc.origin(), fc.anything()])('with a network error', async (origin, reason) => {
      const result = await _.getRecentReviewRequests(origin)({
        fetch: () => Promise.reject(reason),
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(result).toStrictEqual(E.left(new RecentReviewRequestsAreUnavailable({ cause: 'network' })))
    })

    test.prop([fc.origin(), fc.fetchResponse({ status: fc.statusCode().filter(status => status !== Status.OK) })])(
      'with an unexpected status',
      async (origin, response) => {
        const result = await _.getRecentReviewRequests(origin)({
          fetch: () => Promise.resolve(response),
          clock: SystemClock,
          logger: () => IO.of(undefined),
        })()

        expect(result).toStrictEqual(E.left(new RecentReviewRequestsAreUnavailable({ cause: 'non-200-response' })))
      },
    )
  })
})
