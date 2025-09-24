import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import type { FetchEnv } from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/prereview-coar-notify/new-prereview.ts'
import * as fc from './fc.ts'

describe('postNewPrereview', () => {
  test.prop([fc.url(), fc.string(), fc.newPrereview(), fc.fetchResponse({ status: fc.constant(StatusCodes.Created) })])(
    'publishing succeeds',
    async (baseUrl, apiToken, newPrereview, response) => {
      const fetch = jest.fn<FetchEnv['fetch']>(_ => Promise.resolve(response))

      const result = await _.postNewPrereview({ baseUrl, apiToken, newPrereview })({
        fetch,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(result).toStrictEqual(E.right(undefined))
      expect(fetch).toHaveBeenCalledWith(`${baseUrl.origin}/prereviews`, {
        body: JSON.stringify(newPrereview),
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        method: 'POST',
      })
    },
  )

  describe('publishing fails', () => {
    test.prop([fc.url(), fc.string(), fc.newPrereview(), fc.anything()])(
      'with a network error',
      async (baseUrl, apiToken, newPrereview, reason) => {
        const result = await _.postNewPrereview({ baseUrl, apiToken, newPrereview })({
          fetch: () => Promise.reject(reason),
          clock: SystemClock,
          logger: () => IO.of(undefined),
        })()

        expect(result).toStrictEqual(E.left('unavailable'))
      },
    )

    test.prop([
      fc.url(),
      fc.string(),
      fc.newPrereview(),
      fc.fetchResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.Created) }),
    ])('with an unexpected status', async (baseUrl, apiToken, newPrereview, response) => {
      const result = await _.postNewPrereview({ baseUrl, apiToken, newPrereview })({
        fetch: () => Promise.resolve(response),
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(result).toStrictEqual(E.left('unavailable'))
    })
  })
})
