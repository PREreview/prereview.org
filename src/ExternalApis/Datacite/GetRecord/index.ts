import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, pipe } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Doi } from '../../../types/index.ts'
import * as Record from '../Record.ts'

export const GetRecord = (
  doi: Doi.Doi,
): Effect.Effect<Record.Record, Record.RecordIsNotFound | Record.RecordIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`),
    Effect.mapError(error => new Record.RecordIsUnavailable({ cause: error })),
    Effect.andThen(
      HttpClientResponse.matchStatus({
        [StatusCodes.OK]: response => Effect.succeed(response),
        [StatusCodes.NotFound]: response => new Record.RecordIsNotFound({ cause: response }),
        orElse: response => new Record.RecordIsUnavailable({ cause: response }),
      }),
    ),
    Effect.andThen(HttpClientResponse.schemaBodyJson(Record.ResponseSchema(Record.Record))),
    Effect.andThen(body => body.data.attributes),
    Effect.catchTags({
      ParseError: error => new Record.RecordIsUnavailable({ cause: error }),
      ResponseError: error => new Record.RecordIsUnavailable({ cause: error }),
    }),
    Effect.tapErrorTag('RecordIsUnavailable', error =>
      Effect.logError('Failed to get record from DataCite').pipe(Effect.annotateLogs({ error })),
    ),
  )
