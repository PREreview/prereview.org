import { HttpClient, HttpClientResponse } from 'effect/http'
import {
  Array,
  Data,
  Effect,
  pipe,
  Schema,
  SchemaTransformation,
  Number,
  Option,
  SchemaGetter,
  SchemaIssue,
} from 'effect'
import * as StatusCodes from '../../StatusCodes.ts'
import { Doi, OrcidId, Temporal } from '../../types/index.ts'

const NumberFromStringSchema = Schema.String.pipe(
  Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transformEffect(string =>
      Option.match(Number.parse(string), {
        onNone: () => Effect.fail(new SchemaIssue.InvalidValue(undefined, string)),
        onSome: Effect.succeed,
      }),
    ),
    encode: SchemaGetter.String(),
  }),
)

const PublicationDateSchema = Schema.Struct({
  year: NumberFromStringSchema,
  month: Schema.optional(NumberFromStringSchema),
  day: Schema.optional(NumberFromStringSchema),
}).pipe(
  Schema.encodeKeys({ year: 'publication_year', month: 'publication_month', day: 'publication_day' }),
  Schema.decodeTo(
    Schema.Union([Temporal.PlainDateFromPartsSchema, Temporal.PlainYearMonthFromPartsSchema, Schema.Number]),
    SchemaTransformation.transform({
      decode: parts => (typeof parts.month === 'number' ? { ...parts, month: parts.month } : parts.year),
      encode: date => (typeof date === 'number' ? { year: date } : date),
    }),
  ),
)

export class Record extends Schema.Class<Record>('Record')({
  doi: Doi.DoiSchema,
  url: Schema.URLFromString,
  content_type: Schema.Literals(['JA', 'BK', 'RD', 'EL', 'GD']),
  publication_date: PublicationDateSchema,
  title_list: Schema.NonEmptyArray(
    Schema.Struct({
      lang: Schema.Literals(['en', 'ja']),
      title: Schema.String,
      subtitle: Schema.optional(Schema.String),
    }),
  ),
  creator_list: Schema.NonEmptyArray(
    Schema.Struct({
      type: Schema.Literal('person'),
      names: Schema.NonEmptyArray(
        Schema.Struct({
          lang: Schema.Literals(['en', 'ja']),
          last_name: Schema.optional(Schema.String),
          first_name: Schema.String,
        }),
      ),
      researcher_id_list: Schema.Array(
        Schema.Struct({ id_code: OrcidId.OrcidIdFromUrlSchema, type: Schema.Literal('ORCID') }),
      ).pipe(Schema.withDecodingDefaultType(Effect.sync(Array.empty))),
    }),
  ),
}) {}

const ResponseSchema = <A, I, R>(data: Schema.Codec<A, I, R, R>) =>
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
        [StatusCodes.NotFound]: response => Effect.fail(new RecordIsNotFound({ cause: response })),
        orElse: response => Effect.fail(new RecordIsUnavailable({ cause: response })),
      }),
    ),
    Effect.andThen(HttpClientResponse.schemaBodyJson(ResponseSchema(Record))),
    Effect.map(body => body.data),
    Effect.catchTag(['SchemaError', 'HttpClientError'], error => new RecordIsUnavailable({ cause: error })),
    Effect.tapErrorTag('RecordIsUnavailable', error =>
      Effect.logError('Failed to get record from Japan Link Center').pipe(Effect.annotateLogs({ error })),
    ),
    Effect.withSpan('JapanLinkCenter.getRecord', { attributes: { doi } }),
  )
