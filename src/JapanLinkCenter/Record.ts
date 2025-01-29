import { HttpClient, HttpClientResponse } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Data, Effect, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'

class RecordIsNotFound extends Data.TaggedError('RecordIsNotFound')<{ cause?: unknown }> {}

class RecordIsUnavailable extends Data.TaggedError('RecordIsUnavailable')<{ cause?: unknown }> {}

export const getRecord = (
  doi: Doi.Doi,
): Effect.Effect<never, RecordIsNotFound | RecordIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(new URL(encodeURIComponent(encodeURIComponent(doi)), 'https://api.japanlinkcenter.org/dois/')),
    Effect.mapError(error => new RecordIsUnavailable({ cause: error })),
    Effect.andThen(
      HttpClientResponse.matchStatus({
        [StatusCodes.NOT_FOUND]: response => new RecordIsNotFound({ cause: response }),
        orElse: response => new RecordIsUnavailable({ cause: response }),
      }),
    ),
    Effect.scoped,
  )
