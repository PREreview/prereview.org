import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as IO from 'fp-ts/lib/IO.js'
import * as _ from '../src/fetch.ts'
import * as fc from './fc.ts'

describe('collapseRequests', () => {
  test.prop([
    fc.tuple(
      fc.webUrl(),
      fc.record(
        {
          cache: fc.constantFrom('default', 'no-store', 'reload', 'no-cache', 'force-cache', 'only-if-cached'),
          headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
          method: fc.constant('GET'),
        },
        { requiredKeys: ['headers', 'method'] },
      ),
    ),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
  ])('when the requests are sent in parallel', async (request, fetchResponse) => {
    const fetch = fetchMock.sandbox().once({ url: request[0], method: request[1].method }, fetchResponse)
    const env = _.collapseRequests()({
      clock: SystemClock,
      fetch,
      logger: () => IO.of(undefined),
    })

    const [response1, response2] = await Promise.all([env.fetch(...request), env.fetch(...request)])

    expect(response1.status).toStrictEqual(fetchResponse.status)
    expect(Object.fromEntries(Array.from(response1.headers))).toStrictEqual(fetchResponse.headers)
    expect(response2.status).toStrictEqual(fetchResponse.status)
    expect(Object.fromEntries(Array.from(response2.headers))).toStrictEqual(fetchResponse.headers)
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.tuple(
      fc.webUrl(),
      fc.record(
        {
          cache: fc.constantFrom('default', 'no-store', 'reload', 'no-cache', 'force-cache', 'only-if-cached'),
          headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
          method: fc.constant('GET'),
        },
        { requiredKeys: ['headers', 'method'] },
      ),
    ),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
  ])('when the requests are sent in serial', async (request, fetchResponse) => {
    const fetch = fetchMock.sandbox().mock({ repeat: 2, url: request[0], method: request[1].method }, fetchResponse)
    const env = _.collapseRequests()({
      clock: SystemClock,
      fetch,
      logger: () => IO.of(undefined),
    })

    const response1 = await env.fetch(...request)

    await new Promise(setImmediate)

    const response2 = await env.fetch(...request)

    expect(response1.status).toStrictEqual(fetchResponse.status)
    expect(Object.fromEntries(Array.from(response1.headers))).toStrictEqual(fetchResponse.headers)
    expect(response2.status).toStrictEqual(fetchResponse.status)
    expect(Object.fromEntries(Array.from(response2.headers))).toStrictEqual(fetchResponse.headers)
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc
      .tuple(
        fc.tuple(
          fc.webUrl(),
          fc.record(
            {
              cache: fc.constantFrom('default', 'no-store', 'reload', 'no-cache', 'force-cache', 'only-if-cached'),
              headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
              method: fc.requestMethod(),
            },
            { requiredKeys: ['headers', 'method'] },
          ),
        ),
        fc.tuple(
          fc.webUrl(),
          fc.record(
            {
              cache: fc.constantFrom('default', 'no-store', 'reload', 'no-cache', 'force-cache', 'only-if-cached'),
              headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
              method: fc.requestMethod(),
            },
            { requiredKeys: ['headers', 'method'] },
          ),
        ),
      )
      .filter(([request1, request2]) => JSON.stringify(request1) !== JSON.stringify(request2)),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
  ])('when the requests are different', async ([request1, request2], fetchResponse1, fetchResponse2) => {
    const fetch = fetchMock
      .sandbox()
      .once({ url: request1[0], method: request1[1].method }, fetchResponse1)
      .once({ url: request2[0], method: request2[1].method }, fetchResponse2)
    const env = _.collapseRequests()({
      clock: SystemClock,
      fetch,
      logger: () => IO.of(undefined),
    })

    const [response1, response2] = await Promise.all([env.fetch(...request1), env.fetch(...request2)])

    expect(response1.status).toStrictEqual(fetchResponse1.status)
    expect(Object.fromEntries(Array.from(response1.headers))).toStrictEqual(fetchResponse1.headers)
    expect(response2.status).toStrictEqual(fetchResponse2.status)
    expect(Object.fromEntries(Array.from(response2.headers))).toStrictEqual(fetchResponse2.headers)
    expect(fetch.done()).toBeTruthy()
  })
})
