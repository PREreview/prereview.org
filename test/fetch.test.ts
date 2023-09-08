import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as IO from 'fp-ts/IO'
import * as _ from '../src/fetch'
import * as fc from './fc'

describe('revalidateIfStale', () => {
  test.prop([
    fc.url(),
    fc.constant('GET'),
    fc.headers().map(headers => Object.fromEntries(headers.entries())),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
  ])('revalidates if the response is stale', async (url, method, headers, fetchResponse1, fetchResponse2) => {
    const fetch = fetchMock
      .sandbox()
      .once(
        { method, url: url.href, functionMatcher: (_, req) => req.cache === undefined },
        { ...fetchResponse1, headers: { ...fetchResponse1.headers, 'X-Local-Cache-Status': 'stale' } },
      )
      .once(
        { name: 'revalidate', method, url: url.href, functionMatcher: (_, req) => req.cache === 'no-cache' },
        fetchResponse2,
      )
    const env = _.revalidateIfStale()({ fetch })

    const response = await env.fetch(url.href, { headers, method })

    expect(response.status).toStrictEqual(fetchResponse1.status)
    expect(Object.fromEntries(Array.from(response.headers))).toStrictEqual({
      ...fetchResponse1.headers,
      'x-local-cache-status': 'stale',
    })
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.url(),
    fc.constant('GET'),
    fc.headers().map(headers => Object.fromEntries(headers.entries())),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
  ])('only revalidates once', async (url, method, headers, fetchResponse1, fetchResponse2) => {
    const fetch = fetchMock
      .sandbox()
      .mock(
        { method, url: url.href, functionMatcher: (_, req) => req.cache === undefined },
        { ...fetchResponse1, headers: { ...fetchResponse1.headers, 'X-Local-Cache-Status': 'stale' } },
      )
      .once(
        { name: 'revalidate', method, url: url.href, functionMatcher: (_, req) => req.cache === 'no-cache' },
        fetchResponse2,
      )
    const env = _.revalidateIfStale()({ fetch })

    const [response1, response2] = await Promise.all([
      env.fetch(url.href, { headers, method }),
      env.fetch(url.href, { headers, method }),
    ])

    expect(response1.status).toStrictEqual(fetchResponse1.status)
    expect(Object.fromEntries(Array.from(response1.headers))).toStrictEqual({
      ...fetchResponse1.headers,
      'x-local-cache-status': 'stale',
    })
    expect(response2.status).toStrictEqual(fetchResponse1.status)
    expect(Object.fromEntries(Array.from(response2.headers))).toStrictEqual({
      ...fetchResponse1.headers,
      'x-local-cache-status': 'stale',
    })
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.url(),
    fc.constant('GET'),
    fc.headers().map(headers => Object.fromEntries(headers.entries())),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
    fc.error(),
  ])('does nothing if the revalidation fails', async (url, method, headers, fetchResponse, error) => {
    const fetch = fetchMock
      .sandbox()
      .once(
        { method, url: url.href, functionMatcher: (_, req) => req.cache === undefined },
        { ...fetchResponse, headers: { ...fetchResponse.headers, 'X-Local-Cache-Status': 'stale' } },
      )
      .once(
        { name: 'revalidate', method, url: url.href, functionMatcher: (_, req) => req.cache === 'no-cache' },
        { throws: error },
      )
    const env = _.revalidateIfStale()({ fetch })

    const response = await env.fetch(url.href, { headers, method })

    expect(response.status).toStrictEqual(fetchResponse.status)
    expect(Object.fromEntries(Array.from(response.headers))).toStrictEqual({
      ...fetchResponse.headers,
      'x-local-cache-status': 'stale',
    })
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.url(),
    fc.constant('GET'),
    fc.headers().map(headers => Object.fromEntries(headers.entries())),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
  ])("doesn't revalidate if the response is not stale", async (url, method, headers, fetchResponse) => {
    const fetch = fetchMock.sandbox().once({ url: url.href, method }, fetchResponse)
    const env = _.revalidateIfStale()({ fetch })

    const response = await env.fetch(url.href, { headers, method })

    expect(response.status).toStrictEqual(fetchResponse.status)
    expect(Object.fromEntries(Array.from(response.headers))).toStrictEqual(fetchResponse.headers)
    expect(fetch.done()).toBeTruthy()
  })
})

describe('collapseRequests', () => {
  test.prop([
    fc.tuple(
      fc.webUrl(),
      fc.record(
        {
          cache: fc.constantFrom(
            'default' as const,
            'no-store' as const,
            'reload' as const,
            'no-cache' as const,
            'force-cache' as const,
            'only-if-cached' as const,
          ),
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
          cache: fc.constantFrom(
            'default' as const,
            'no-store' as const,
            'reload' as const,
            'no-cache' as const,
            'force-cache' as const,
            'only-if-cached' as const,
          ),
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
    fc.tuple(
      fc.webUrl(),
      fc.record(
        {
          cache: fc.constantFrom(
            'default' as const,
            'no-store' as const,
            'reload' as const,
            'no-cache' as const,
            'force-cache' as const,
            'only-if-cached' as const,
          ),
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
          cache: fc.constantFrom(
            'default' as const,
            'no-store' as const,
            'reload' as const,
            'no-cache' as const,
            'force-cache' as const,
            'only-if-cached' as const,
          ),
          headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
          method: fc.requestMethod(),
        },
        { requiredKeys: ['headers', 'method'] },
      ),
    ),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
    fc.record({
      status: fc.integer({ min: 200, max: 599 }),
      headers: fc.headers().map(headers => Object.fromEntries(headers.entries())),
    }),
  ])('when the requests are different', async (request1, request2, fetchResponse1, fetchResponse2) => {
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
