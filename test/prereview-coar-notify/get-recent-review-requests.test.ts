import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import type { Fetch } from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as T from 'fp-ts/lib/Task.js'
import { Status } from 'hyper-ts'
import * as _ from '../../src/prereview-coar-notify/get-recent-review-requests.js'
import { RecentReviewRequestsC } from '../../src/prereview-coar-notify/get-recent-review-requests.js'
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
              id => !['biorxiv', 'medrxiv', 'osf', 'lifecycle-journal', 'zenodo', 'africarxiv'].includes(id.type),
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
      sleep: () => T.of(undefined),
    })()

    expect(result).toStrictEqual(E.right(requests))
    expect(fetch).toHaveBeenCalledWith(`${origin}requests`, expect.objectContaining({ method: 'GET' }))
  })

  test.prop([
    fc.origin(),
    fc
      .array(
        fc.record({
          timestamp: fc.instant(),
          preprint: fc
            .indeterminatePreprintIdWithDoi()
            .filter(
              id => !['biorxiv', 'medrxiv', 'osf', 'lifecycle-journal', 'zenodo', 'africarxiv'].includes(id.type),
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
            headers: fc.headers(fc.constant({ 'x-local-cache-status': 'stale' })),
            status: fc.constant(Status.OK),
            text: fc.constant(RecentReviewRequestsC.encode(requests)),
          }),
        ),
      ),
  ])('when the response is stale', async (origin, [requests, response]) => {
    const fetch = jest.fn<Fetch>(_ => Promise.resolve(response.clone()))

    const result = await _.getRecentReviewRequests(origin)({
      fetch,
      clock: SystemClock,
      logger: () => IO.of(undefined),
      sleep: () => T.of(undefined),
    })()

    expect(result).toStrictEqual(E.right(requests))
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenCalledWith(
      `${origin}requests`,
      expect.objectContaining({ cache: 'force-cache', method: 'GET' }),
    )
    expect(fetch).toHaveBeenCalledWith(
      `${origin}requests`,
      expect.objectContaining({ cache: 'no-cache', method: 'GET' }),
    )
  })

  describe('when the request fails', () => {
    test.prop([fc.origin(), fc.anything()])('with a network error', async (origin, reason) => {
      const result = await _.getRecentReviewRequests(origin)({
        fetch: () => Promise.reject(reason),
        clock: SystemClock,
        logger: () => IO.of(undefined),
        sleep: () => T.of(undefined),
      })()

      expect(result).toStrictEqual(E.left('unavailable'))
    })

    test.prop([fc.origin(), fc.fetchResponse({ status: fc.statusCode().filter(status => status !== Status.OK) })])(
      'with an unexpected status',
      async (origin, response) => {
        const result = await _.getRecentReviewRequests(origin)({
          fetch: () => Promise.resolve(response),
          clock: SystemClock,
          logger: () => IO.of(undefined),
          sleep: () => T.of(undefined),
        })()

        expect(result).toStrictEqual(E.left('unavailable'))
      },
    )
  })
})
