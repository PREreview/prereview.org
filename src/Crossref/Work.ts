import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Data, Effect, pipe, Schema, Tuple } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from '../types/Doi.js'

const PublishedSchema = Schema.transform(
  Schema.Struct({ 'date-parts': Schema.Tuple(Schema.Tuple(Schema.Number)) }),
  Schema.Number,
  {
    strict: true,
    decode: input => input['date-parts'][0][0],
    encode: year => ({ 'date-parts': Tuple.make(Tuple.make(year)) }),
  },
)

export class Work extends Schema.Class<Work>('Work')({
  DOI: Doi.DoiSchema,
  resource: Schema.Struct({
    primary: Schema.Struct({
      URL: Schema.URL,
    }),
  }),
  title: Schema.Tuple(Schema.String),
  author: Schema.NonEmptyArray(
    Schema.Struct({
      given: Schema.NonEmptyTrimmedString,
      family: Schema.NonEmptyTrimmedString,
    }),
  ),
  published: PublishedSchema,
  'group-title': Schema.NonEmptyTrimmedString,
  type: Schema.NonEmptyTrimmedString,
  subtype: Schema.optional(Schema.NonEmptyTrimmedString),
}) {}

const ResponseSchema = <A, I, R>(message: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    status: Schema.Literal('ok'),
    message,
  })

class WorkIsNotFound extends Data.TaggedError('WorkIsNotFound')<{ cause?: unknown }> {}

class WorkIsUnavailable extends Data.TaggedError('WorkIsUnavailable')<{ cause?: unknown }> {}

export const getWork = (doi: Doi.Doi): Effect.Effect<Work, WorkIsNotFound | WorkIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`),
    Effect.mapError(error => new WorkIsUnavailable({ cause: error })),
    Effect.andThen(
      HttpClientResponse.matchStatus({
        [StatusCodes.OK]: response => Effect.succeed(response),
        [StatusCodes.NOT_FOUND]: response => new WorkIsNotFound({ cause: response }),
        orElse: response => new WorkIsUnavailable({ cause: response }),
      }),
    ),
    Effect.andThen(HttpClientResponse.schemaBodyJson(ResponseSchema(Work))),
    Effect.andThen(body => body.message),
    Effect.catchTags({
      ParseError: error => new WorkIsUnavailable({ cause: error }),
      ResponseError: error => new WorkIsUnavailable({ cause: error }),
    }),
  )
