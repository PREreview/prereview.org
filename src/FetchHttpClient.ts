import { FetchHttpClient } from '@effect/platform'
import { Effect } from 'effect'
import fetch from 'make-fetch-happen'
import { PublicUrl } from './public-url.js'

export const Fetch = FetchHttpClient.Fetch

export const makeFetch = Effect.gen(function* () {
  const publicUrl = yield* PublicUrl

  return fetch.defaults({
    cachePath: 'data/cache',
    headers: {
      'User-Agent': `PREreview (${publicUrl.href}; mailto:engineering@prereview.org)`,
    },
  }) as unknown as typeof globalThis.fetch
})
