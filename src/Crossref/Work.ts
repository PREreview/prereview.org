import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Effect, flow, Match, ParseResult, pipe, Schema, Tuple } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from '../types/Doi.js'
import * as Orcid from '../types/Orcid.js'

const OrcidFromUrlSchema = Schema.transformOrFail(Schema.URL, Schema.typeSchema(Orcid.OrcidSchema), {
  strict: true,
  decode: (url, _, ast) =>
    ParseResult.fromOption(Orcid.parse(url.href), () => new ParseResult.Type(ast, url, 'Not an ORCID iD')),
  encode: orcid => ParseResult.succeed(Orcid.toUrl(orcid)),
})

const PublishedSchema = Schema.transformOrFail(
  Schema.Struct({
    'date-parts': Schema.Tuple(
      Schema.Union(
        Schema.Tuple(Schema.Number),
        Schema.Tuple(Schema.Number, Schema.Number),
        Schema.Tuple(Schema.Number, Schema.Number, Schema.Number),
      ),
    ),
  }),
  Schema.Union(Schema.Number, Schema.instanceOf(Temporal.PlainYearMonth), Schema.instanceOf(Temporal.PlainDate)),
  {
    strict: true,
    decode: (input, _, ast) =>
      pipe(
        Match.value(input['date-parts'][0]),
        Match.when([Match.number, Match.number, Match.number], input =>
          ParseResult.try({
            try: () =>
              Temporal.PlainDate.from({ year: input[0], month: input[1], day: input[2] }, { overflow: 'reject' }),
            catch: () => new ParseResult.Type(ast, input, 'Not a PlainDate'),
          }),
        ),
        Match.when([Match.number, Match.number], input =>
          ParseResult.try({
            try: () => Temporal.PlainYearMonth.from({ year: input[0], month: input[1] }, { overflow: 'reject' }),
            catch: () => new ParseResult.Type(ast, input, 'Not a PlainYearMonth'),
          }),
        ),
        Match.when([Match.number], input => ParseResult.succeed(input[0])),
        Match.exhaustive,
      ),
    encode: flow(
      Match.value,
      Match.when(Match.instanceOfUnsafe(Temporal.PlainDate), date =>
        ParseResult.succeed({ 'date-parts': Tuple.make(Tuple.make(date.year, date.month, date.day)) }),
      ),
      Match.when(Match.instanceOfUnsafe(Temporal.PlainYearMonth), date =>
        ParseResult.succeed({ 'date-parts': Tuple.make(Tuple.make(date.year, date.month)) }),
      ),
      Match.when(Match.number, date => ParseResult.succeed({ 'date-parts': Tuple.make(Tuple.make(date)) })),
      Match.exhaustive,
    ),
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
  author: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        ORCID: Schema.optional(OrcidFromUrlSchema),
        given: Schema.NonEmptyTrimmedString,
        family: Schema.NonEmptyTrimmedString,
      }),
    ),
    { default: Array.empty },
  ),
  published: PublishedSchema,
  'group-title': Schema.optional(Schema.NonEmptyTrimmedString),
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
