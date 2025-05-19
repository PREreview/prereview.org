import { FetchHttpClient, HttpClient } from '@effect/platform'
import { type Array, Context, Effect, flow, Layer } from 'effect'
import { getPreprint, resolvePreprintId } from '../get-preprint.js'
import type * as Preprint from '../preprint.js'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'

export class Preprints extends Context.Tag('Preprints')<
  Preprints,
  {
    getPreprint: (
      id: IndeterminatePreprintId,
    ) => Effect.Effect<Preprint.Preprint, Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable>
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
      getPreprint: flow(
        getPreprint,
        Effect.provideService(HttpClient.HttpClient, httpClient),
        Effect.provideService(FetchHttpClient.Fetch, fetch),
      ),
      resolvePreprintId: flow(
        resolvePreprintId,
        Effect.provideService(HttpClient.HttpClient, httpClient),
        Effect.provideService(FetchHttpClient.Fetch, fetch),
      ),
    }
  }),
)
