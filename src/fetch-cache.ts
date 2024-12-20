import type * as F from 'fetch-fp-ts'
import * as R from 'fp-ts/lib/Reader.js'

export const fetchWithCache: R.Reader<F.FetchEnv, F.Fetch> = R.asks(
  env => (url, init) => env.fetch(url, { ...init, cache: 'no-store' }),
)
