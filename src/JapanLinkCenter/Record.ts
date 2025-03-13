import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Effect, Match, ParseResult, pipe, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Orcid from 'orcid-id-ts'
import * as FptsToEffect from '../FptsToEffect.js'
import * as Doi from '../types/Doi.js'

const OrcidFromUrlSchema = Schema.transformOrFail(
  Schema.URL,
  Schema.typeSchema(pipe(Schema.String, Schema.filter(Orcid.isOrcid))),
  {
    strict: true,
    decode: (url, _, ast) =>
      ParseResult.fromOption(
        FptsToEffect.option(Orcid.parse(url.href)),
        () => new ParseResult.Type(ast, url, 'Not an ORCID iD'),
      ),
    encode: orcid => ParseResult.succeed(Orcid.toUrl(orcid)),
  },
)

const PublicationDateSchema = Schema.transformOrFail(
  Schema.Struct({
    year: Schema.propertySignature(Schema.NumberFromString).pipe(Schema.fromKey('publication_year')),
    month: Schema.optional(Schema.NumberFromString).pipe(Schema.fromKey('publication_month')),
    day: Schema.optional(Schema.NumberFromString).pipe(Schema.fromKey('publication_day')),
  }),
  Schema.Union(Schema.Number, Schema.instanceOf(Temporal.PlainYearMonth), Schema.instanceOf(Temporal.PlainDate)),
  {
    strict: true,
    decode: (input, _, ast) =>
      pipe(
        Match.value(input),
        Match.when({ year: Match.number, month: Match.number, day: Match.number }, input =>
          ParseResult.try({
            try: () => Temporal.PlainDate.from(input, { overflow: 'reject' }),
            catch: () => new ParseResult.Type(ast, input, 'Not a PlainDate'),
          }),
        ),
        Match.when({ year: Match.number, month: Match.number }, input =>
          ParseResult.try({
            try: () => Temporal.PlainYearMonth.from(input, { overflow: 'reject' }),
            catch: () => new ParseResult.Type(ast, input, 'Not a PlainYearMonth'),
          }),
        ),
        Match.when({ year: Match.number }, input => ParseResult.succeed(input.year)),
        Match.exhaustive,
      ),
    encode: date => ParseResult.succeed(typeof date === 'number' ? { year: date } : date),
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
        Schema.Array(Schema.Struct({ id_code: OrcidFromUrlSchema, type: Schema.Literal('ORCID') })),
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

export const getRecord = (
  doi: Doi.Doi,
): Effect.Effect<Record, RecordIsNotFound | RecordIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(new URL(encodeURIComponent(encodeURIComponent(doi)), 'https://api.japanlinkcenter.org/dois/')),
    Effect.mapError(error => new RecordIsUnavailable({ cause: error })),
    Effect.andThen(
      HttpClientResponse.matchStatus({
        [StatusCodes.OK]: response => Effect.succeed(response),
        [StatusCodes.NOT_FOUND]: response => new RecordIsNotFound({ cause: response }),
        orElse: response => new RecordIsUnavailable({ cause: response }),
      }),
    ),
    Effect.andThen(HttpClientResponse.schemaBodyJson(ResponseSchema(Record))),
    Effect.andThen(body => body.data),
    Effect.catchTags({
      ParseError: error => new RecordIsUnavailable({ cause: error }),
      ResponseError: error => new RecordIsUnavailable({ cause: error }),
    }),
    Effect.scoped,
  )
