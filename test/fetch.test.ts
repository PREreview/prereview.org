import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
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
  ])("doesn't revalidate if the response is not stale", async (url, method, headers, fetchResponse) => {
    const fetch = fetchMock.sandbox().once({ url: url.href, method }, fetchResponse)
    const env = _.revalidateIfStale()({ fetch })

    const response = await env.fetch(url.href, { headers, method })

    expect(response.status).toStrictEqual(fetchResponse.status)
    expect(Object.fromEntries(Array.from(response.headers))).toStrictEqual(fetchResponse.headers)
    expect(fetch.done()).toBeTruthy()
  })
})
