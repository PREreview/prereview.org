import { FetchHttpClient } from '@effect/platform'
import { Config, Effect } from 'effect'
import fetch from 'make-fetch-happen'
import { PublicUrl } from './public-url.js'

export const Fetch = FetchHttpClient.Fetch

export const makeFetch = Effect.gen(function* () {
  const publicUrl = yield* PublicUrl
  const disableLegacyVolumeBasedCache = yield* Config.withDefault(
    Config.boolean('DISABLE_LEGACY_VOLUME_BASED_CACHE'),
    false,
  )

  if (disableLegacyVolumeBasedCache) {
    yield* Effect.logDebug('Legacy cache should be disabled')
  }

  return fetch.defaults({
    cachePath: 'data/cache',
    headers: {
      'User-Agent': `PREreview (${publicUrl.href}; mailto:engineering@prereview.org)`,
    },
  }) as unknown as typeof globalThis.fetch
})
