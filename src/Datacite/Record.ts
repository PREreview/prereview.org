import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Array, Data, Effect, pipe, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from '../types/Doi.js'
import { Temporal } from '../types/index.js'

export class Record extends Schema.Class<Record>('Record')({
  doi: Doi.DoiSchema,
  creators: Schema.optionalWith(
    Schema.Array(
      Schema.Union(
        Schema.Struct({
          givenName: Schema.NonEmptyTrimmedString,
          familyName: Schema.NonEmptyTrimmedString,
          nameIdentifiers: Schema.optionalWith(
            Schema.Array(
              Schema.Struct({
                nameIdentifier: Schema.NonEmptyTrimmedString,
                nameIdentifierScheme: Schema.NonEmptyTrimmedString,
              }),
            ),
            { default: Array.empty },
          ),
        }),
        Schema.Struct({
          name: Schema.NonEmptyTrimmedString,
          nameIdentifiers: Schema.optionalWith(
            Schema.Array(
              Schema.Struct({
                nameIdentifier: Schema.NonEmptyTrimmedString,
                nameIdentifierScheme: Schema.NonEmptyTrimmedString,
              }),
            ),
            { default: Array.empty },
          ),
        }),
      ),
    ),
    { default: Array.empty },
  ),
  titles: Schema.NonEmptyArray(
    Schema.Struct({
      title: Schema.NonEmptyTrimmedString,
    }),
  ),
  dates: Schema.NonEmptyArray(
    Schema.Struct({
      date: Schema.Union(Temporal.PlainDateSchema, Temporal.PlainYearMonthSchema, Schema.NumberFromString),
      dateType: Schema.NonEmptyTrimmedString,
    }),
  ),
  types: Schema.Struct({
    resourceType: Schema.optional(Schema.NonEmptyTrimmedString),
    resourceTypeGeneral: Schema.optional(Schema.NonEmptyTrimmedString),
  }),
  descriptions: Schema.Array(
    Schema.Struct({
      description: Schema.NonEmptyTrimmedString,
      descriptionType: Schema.NonEmptyTrimmedString,
    }),
  ),
  url: Schema.URL,
}) {}

export const ResponseSchema = <A, I, R>(attributes: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    data: Schema.Struct({
      attributes,
    }),
  })

class RecordIsNotFound extends Data.TaggedError('RecordIsNotFound')<{ cause?: unknown }> {}

class RecordIsUnavailable extends Data.TaggedError('RecordIsUnavailable')<{ cause?: unknown }> {}

export const getRecord = (
  doi: Doi.Doi,
): Effect.Effect<Record, RecordIsNotFound | RecordIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`),
    Effect.mapError(error => new RecordIsUnavailable({ cause: error })),
    Effect.andThen(
      HttpClientResponse.matchStatus({
        [StatusCodes.OK]: response => Effect.succeed(response),
        [StatusCodes.NOT_FOUND]: response => new RecordIsNotFound({ cause: response }),
        orElse: response => new RecordIsUnavailable({ cause: response }),
      }),
    ),
    Effect.andThen(HttpClientResponse.schemaBodyJson(ResponseSchema(Record))),
    Effect.andThen(body => body.data.attributes),
    Effect.catchTags({
      ParseError: error => new RecordIsUnavailable({ cause: error }),
      ResponseError: error => new RecordIsUnavailable({ cause: error }),
    }),
  )
