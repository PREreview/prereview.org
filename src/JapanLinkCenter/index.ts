import { FetchHttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { DeprecatedSleepEnv } from '../Context.js'
import { revalidateIfStale, timeoutRequest, useStaleCache } from '../fetch.js'
import * as Preprint from '../preprint.js'
import type { JapanLinkCenterPreprintId } from './PreprintId.js'
import { getRecord } from './Record.js'

export { isJapanLinkCenterPreprintDoi, type JapanLinkCenterPreprintId } from './PreprintId.js'

export const getPreprintFromJapanLinkCenter: (
  id: JapanLinkCenterPreprintId,
) => Effect.Effect<
  Preprint.Preprint,
  Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  FetchHttpClient.Fetch | DeprecatedSleepEnv
> = id =>
  pipe(
    getRecord(id.value),
    Effect.andThen(() => Effect.fail(new Preprint.PreprintIsUnavailable({}))),
    Effect.catchTags({
      RecordIsUnavailable: error => new Preprint.PreprintIsUnavailable({ cause: error }),
    }),
    Effect.provide(FetchHttpClient.layer),
    Effect.provideServiceEffect(
      FetchHttpClient.Fetch,
      Effect.gen(function* () {
        const fetch = yield* FetchHttpClient.Fetch
        const sleep = yield* DeprecatedSleepEnv

        return pipe({ fetch, ...sleep }, revalidateIfStale(), useStaleCache(), timeoutRequest(2000)).fetch
      }),
    ),
  )
