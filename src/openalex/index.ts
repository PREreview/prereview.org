import { FetchHttpClient } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Effect, pipe } from 'effect'
import type * as F from 'fetch-fp-ts'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { revalidateIfStale, useStaleCache } from '../fetch.js'
import { getCategories, getWorkByDoi, WorkIsUnavailable } from './work.js'

export const getCategoriesFromOpenAlex = (doi: Doi.Doi) =>
  pipe(
    R.asks(
      (env: F.FetchEnv) => () =>
        pipe(
          getWorkByDoi(doi),
          Effect.timeout('2 seconds'),
          Effect.catchTag('TimeoutException', error => new WorkIsUnavailable({ cause: error })),
          Effect.provide(FetchHttpClient.layer),
          Effect.provideService(FetchHttpClient.Fetch, env.fetch as typeof globalThis.fetch),
          Effect.either,
          Effect.runPromise,
        ),
    ),
    RTE.local(revalidateIfStale()),
    RTE.local(useStaleCache()),
    RTE.map(getCategories),
  )
