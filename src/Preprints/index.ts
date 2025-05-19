import { FetchHttpClient, HttpClient } from '@effect/platform'
import { type Array, Context, Effect, flow, Layer } from 'effect'
import { resolvePreprintId } from '../get-preprint.js'
import type * as Preprint from '../preprint.js'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'

export class Preprints extends Context.Tag('Preprints')<
  Preprints,
  {
    resolvePreprintId: (
      ...ids: Array.NonEmptyReadonlyArray<IndeterminatePreprintId>
    ) => Effect.Effect<PreprintId, Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable>
  }
>() {}

export const layer = Layer.effect(
  Preprints,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const httpClient = yield* HttpClient.HttpClient

    return {
      resolvePreprintId: flow(
        resolvePreprintId,
        Effect.provideService(HttpClient.HttpClient, httpClient),
        Effect.provideService(FetchHttpClient.Fetch, fetch),
      ),
    }
  }),
)
