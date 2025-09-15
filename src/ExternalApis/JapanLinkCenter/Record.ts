import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Array, Data, Effect, flow, identity, Match, pipe, Schema, Struct } from 'effect'
import * as StatusCodes from '../../StatusCodes.js'
import { Doi, Orcid, Temporal } from '../../types/index.js'

const PublicationDateSchema = Schema.transform(
  Schema.Struct({
    year: Schema.propertySignature(Schema.NumberFromString).pipe(Schema.fromKey('publication_year')),
    month: Schema.optional(Schema.NumberFromString).pipe(Schema.fromKey('publication_month')),
    day: Schema.optional(Schema.NumberFromString).pipe(Schema.fromKey('publication_day')),
  }),
  Schema.Union(Temporal.PlainDateFromPartsSchema, Temporal.PlainYearMonthFromPartsSchema, Schema.Number),
  {
    strict: true,
    decode: flow(
      Match.value,
      Match.when({ year: Match.number, month: Match.number }, identity),
      Match.when({ year: Match.number }, Struct.get('year')),
      Match.exhaustive,
    ),
    encode: date => (typeof date === 'number' ? { year: date } : date),
  },
)

export class Record extends Schema.Class<Record>('Record')({
  doi: Doi.DoiSchema,
  url: Schema.URL,
  content_type: Schema.Literal('JA', 'BK', 'RD', 'EL', 'GD'),
  publication_date: PublicationDateSchema,
  title_list: Schema.NonEmptyArray(
    Schema.Struct({
      lang: Schema.Literal('en', 'ja'),
      title: Schema.String,
      subtitle: Schema.optional(Schema.String),
    }),
  ),
  creator_list: Schema.NonEmptyArray(
    Schema.Struct({
      type: Schema.Literal('person'),
      names: Schema.NonEmptyArray(
        Schema.Struct({
          lang: Schema.Literal('en', 'ja'),
          last_name: Schema.optional(Schema.String),
          first_name: Schema.String,
        }),
      ),
      researcher_id_list: Schema.optionalWith(
        Schema.Array(Schema.Struct({ id_code: Orcid.OrcidFromUrlSchema, type: Schema.Literal('ORCID') })),
        { default: Array.empty },
      ),
    }),
  ),
}) {}

const ResponseSchema = <A, I, R>(data: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    status: Schema.Literal('OK'),
    data,
  })

class RecordIsNotFound extends Data.TaggedError('RecordIsNotFound')<{ cause?: unknown }> {}

class RecordIsUnavailable extends Data.TaggedError('RecordIsUnavailable')<{ cause?: unknown }> {}

export const GetRecord = (
  doi: Doi.Doi,
): Effect.Effect<Record, RecordIsNotFound | RecordIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(new URL(encodeURIComponent(encodeURIComponent(doi)), 'https://api.japanlinkcenter.org/dois/')),
    Effect.mapError(error => new RecordIsUnavailable({ cause: error })),
    Effect.andThen(
      HttpClientResponse.matchStatus({
        [StatusCodes.OK]: response => Effect.succeed(response),
        [StatusCodes.NotFound]: response => new RecordIsNotFound({ cause: response }),
        orElse: response => new RecordIsUnavailable({ cause: response }),
      }),
    ),
    Effect.andThen(HttpClientResponse.schemaBodyJson(ResponseSchema(Record))),
    Effect.andThen(body => body.data),
    Effect.catchTag('ParseError', 'ResponseError', error => new RecordIsUnavailable({ cause: error })),
    Effect.tapErrorTag('RecordIsUnavailable', error =>
      Effect.logError('Failed to get record from Japan Link Center').pipe(Effect.annotateLogs({ error })),
    ),
  )
