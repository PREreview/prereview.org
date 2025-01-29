import { HttpClient } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Data, Effect, pipe } from 'effect'

class RecordIsUnavailable extends Data.TaggedError('RecordIsUnavailable')<{ cause?: unknown }> {}

export const getRecord = (doi: Doi.Doi): Effect.Effect<never, RecordIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(new URL(encodeURIComponent(encodeURIComponent(doi)), 'https://api.japanlinkcenter.org/dois/')),
    Effect.mapError(error => new RecordIsUnavailable({ cause: error })),
    Effect.andThen(response => new RecordIsUnavailable({ cause: response })),
    Effect.scoped,
  )
