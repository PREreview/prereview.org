import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, pipe } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Doi } from '../../../types/index.ts'
import { ResponseSchema, Work, WorkIsNotFound, WorkIsUnavailable } from '../Work.ts'

export const GetWork = (doi: Doi.Doi): Effect.Effect<Work, WorkIsNotFound | WorkIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`),
    Effect.mapError(error => new WorkIsUnavailable({ cause: error })),
    Effect.andThen(
      HttpClientResponse.matchStatus({
        [StatusCodes.OK]: response => Effect.succeed(response),
        [StatusCodes.NotFound]: response => new WorkIsNotFound({ cause: response }),
        orElse: response => new WorkIsUnavailable({ cause: response }),
      }),
    ),
    Effect.andThen(HttpClientResponse.schemaBodyJson(ResponseSchema(Work))),
    Effect.andThen(body => body.message),
    Effect.catchTags({
      ParseError: error => new WorkIsUnavailable({ cause: error }),
      ResponseError: error => new WorkIsUnavailable({ cause: error }),
    }),
    Effect.tapErrorTag('WorkIsUnavailable', error =>
      Effect.logError('Failed to get work from Crossref').pipe(Effect.annotateLogs({ error })),
    ),
  )
