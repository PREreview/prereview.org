import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import type { FetchEnv } from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import * as _ from '../../src/prereview-coar-notify/new-prereview.js'
import * as fc from './fc.js'

describe('postNewPrereview', () => {
  test.prop([fc.url(), fc.string(), fc.newPrereview(), fc.fetchResponse({ status: fc.constant(Status.Created) })])(
    'publishing succeeds',
    async (baseUrl, apiToken, newPrereview, response) => {
      const fetch = jest.fn<FetchEnv['fetch']>(_ => Promise.resolve(response))

      const result = await _.postNewPrereview({ baseUrl, apiToken, newPrereview })({ fetch })()

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
        })()

        expect(result).toStrictEqual(E.left('unavailable'))
      },
    )

    test.prop([
      fc.url(),
      fc.string(),
      fc.newPrereview(),
      fc.fetchResponse({ status: fc.statusCode().filter(status => status !== Status.Created) }),
    ])('with an unexpected status', async (baseUrl, apiToken, newPrereview, response) => {
      const result = await _.postNewPrereview({ baseUrl, apiToken, newPrereview })({
        fetch: () => Promise.resolve(response),
      })()

      expect(result).toStrictEqual(E.left('unavailable'))
    })
  })
})
