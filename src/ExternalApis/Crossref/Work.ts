import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Array, Data, Effect, pipe, Schema, Tuple } from 'effect'
import * as StatusCodes from '../../StatusCodes.js'
import { Doi, Orcid, Temporal } from '../../types/index.js'

const PlainYearFromTupleSchema = Schema.transform(Schema.Tuple(Schema.Number), Schema.Number, {
  strict: true,
  decode: parts => parts[0],
  encode: date => Tuple.make(date),
})

const PlainYearMonthFromTupleSchema = Schema.transform(
  Schema.Tuple(Schema.Number, Schema.Number),
  Temporal.PlainYearMonthFromPartsSchema,
  {
    strict: true,
    decode: parts => ({ year: parts[0], month: parts[1] }),
    encode: parts => Tuple.make(parts.year, parts.month),
  },
)

const PlainDateFromTupleSchema = Schema.transform(
  Schema.Tuple(Schema.Number, Schema.Number, Schema.Number),
  Temporal.PlainDateFromPartsSchema,
  {
    strict: true,
    decode: parts => ({ year: parts[0], month: parts[1], day: parts[2] }),
    encode: parts => Tuple.make(parts.year, parts.month, parts.day),
  },
)

const PublishedSchema = Schema.transform(
  Schema.Struct({
    'date-parts': Schema.Tuple(
      Schema.Union(PlainYearFromTupleSchema, PlainYearMonthFromTupleSchema, PlainDateFromTupleSchema),
    ),
  }),
  Schema.Union(Temporal.PlainDateFromSelfSchema, Temporal.PlainYearMonthFromSelfSchema, Schema.Number),
  {
    strict: true,
    decode: input => input['date-parts'][0],
    encode: date => ({ 'date-parts': Tuple.make(date) }),
  },
)

export class Work extends Schema.Class<Work>('Work')({
  DOI: Doi.DoiSchema,
  resource: Schema.Struct({
    primary: Schema.Struct({
      URL: Schema.URL,
    }),
  }),
  title: Schema.Union(Schema.Tuple(), Schema.Tuple(Schema.String)),
  abstract: Schema.optional(Schema.String),
  author: Schema.optionalWith(
    Schema.Array(
      Schema.Union(
        Schema.Struct({
          ORCID: Schema.optional(Orcid.OrcidFromUrlSchema),
          given: Schema.optional(Schema.compose(Schema.Trim, Schema.NonEmptyString)),
          family: Schema.compose(Schema.Trim, Schema.NonEmptyString),
        }),
        Schema.Struct({
          name: Schema.compose(Schema.Trim, Schema.NonEmptyString),
        }),
      ),
    ),
    { default: Array.empty },
  ),
  institution: Schema.optional(Schema.Tuple(Schema.Struct({ name: Schema.String }))),
  published: PublishedSchema,
  'group-title': Schema.optional(Schema.compose(Schema.Trim, Schema.NonEmptyString)),
  type: Schema.compose(Schema.Trim, Schema.NonEmptyString),
  subtype: Schema.optional(Schema.compose(Schema.Trim, Schema.NonEmptyString)),
}) {}

export const ResponseSchema = <A, I, R>(message: Schema.Schema<A, I, R>) =>
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
