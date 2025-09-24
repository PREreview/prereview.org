import { HttpClient, HttpClientResponse } from '@effect/platform'
import { type Doi, toUrl } from 'doi-ts'
import { Array, Data, Effect, Equivalence, flow, pipe, Schema, String, Struct } from 'effect'
import * as StatusCodes from '../StatusCodes.ts'

export type Work = typeof WorkSchema.Type

export const WorkSchema = Schema.Struct({
  topics: Schema.Array(
    Schema.Struct({
      id: Schema.URL,
      display_name: Schema.String,
      subfield: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      field: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      domain: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
    }),
  ),
})

export class WorkIsNotFound extends Data.TaggedError('WorkIsNotFound')<{ cause?: unknown }> {}

export class WorkIsUnavailable extends Data.TaggedError('WorkIsUnavailable')<{ cause?: unknown }> {}

export const getWorkByDoi = (
  doi: Doi,
): Effect.Effect<Work, WorkIsNotFound | WorkIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(`https://api.openalex.org/works/${toUrl(doi).href}`),
    Effect.mapError(error => new WorkIsUnavailable({ cause: error })),
    Effect.andThen(
      HttpClientResponse.matchStatus({
        [StatusCodes.OK]: response => Effect.succeed(response),
        [StatusCodes.NotFound]: response => new WorkIsNotFound({ cause: response }),
        [StatusCodes.Gone]: response => new WorkIsNotFound({ cause: response }),
        orElse: response => new WorkIsUnavailable({ cause: response }),
      }),
    ),
    Effect.andThen(HttpClientResponse.schemaBodyJson(WorkSchema)),
    Effect.catchTag('ParseError', 'ResponseError', error => new WorkIsUnavailable({ cause: error })),
    Effect.tapErrorTag('WorkIsUnavailable', error =>
      Effect.logError('Failed to get work from OpenAlex').pipe(Effect.annotateLogs({ error })),
    ),
  )

const UrlEquivalence: Equivalence.Equivalence<URL> = Equivalence.mapInput(String.Equivalence, url => url.href)

export const getCategories: (work: Work) => ReadonlyArray<{ id: URL; display_name: string }> = flow(
  Struct.get('topics'),
  Array.flatMap(topic => [
    { id: topic.id, display_name: topic.display_name },
    { id: topic.subfield.id, display_name: topic.subfield.display_name },
    { id: topic.field.id, display_name: topic.field.display_name },
    { id: topic.domain.id, display_name: topic.domain.display_name },
  ]),
  Array.dedupeWith(Equivalence.mapInput(UrlEquivalence, Struct.get('id'))),
)
