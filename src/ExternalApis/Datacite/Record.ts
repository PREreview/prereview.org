import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Array, Data, Effect, Function, pipe, Schema, String } from 'effect'
import * as StatusCodes from '../../StatusCodes.js'
import { Doi, Temporal } from '../../types/index.js'

const EmptyStringAsUndefinedSchema = Schema.transform(
  Schema.compose(Schema.Trim, Schema.Literal('')),
  Schema.Undefined,
  {
    strict: true,
    decode: Function.constUndefined,
    encode: Function.constant(String.empty),
  },
)

export class Record extends Schema.Class<Record>('Record')({
  doi: Doi.DoiSchema,
  creators: Schema.optionalWith(
    Schema.Array(
      Schema.Union(
        Schema.Struct({
          givenName: Schema.compose(Schema.Trim, Schema.NonEmptyString),
          familyName: Schema.compose(Schema.Trim, Schema.NonEmptyString),
          nameIdentifiers: Schema.optionalWith(
            Schema.Array(
              Schema.Struct({
                nameIdentifier: Schema.compose(Schema.Trim, Schema.NonEmptyString),
                nameIdentifierScheme: Schema.compose(Schema.Trim, Schema.NonEmptyString),
              }),
            ),
            { default: Array.empty },
          ),
        }),
        Schema.Struct({
          name: Schema.compose(Schema.Trim, Schema.NonEmptyString),
          nameIdentifiers: Schema.optionalWith(
            Schema.Array(
              Schema.Struct({
                nameIdentifier: Schema.compose(Schema.Trim, Schema.NonEmptyString),
                nameIdentifierScheme: Schema.compose(Schema.Trim, Schema.NonEmptyString),
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
      title: Schema.compose(Schema.Trim, Schema.NonEmptyString),
    }),
  ),
  publisher: Schema.compose(Schema.Trim, Schema.NonEmptyString),
  dates: Schema.NonEmptyArray(
    Schema.Struct({
      date: Schema.Union(
        Temporal.InstantSchema,
        Temporal.PlainDateSchema,
        Temporal.PlainYearMonthSchema,
        Schema.NumberFromString,
      ),
      dateType: Schema.compose(Schema.Trim, Schema.NonEmptyString),
    }),
  ),
  types: Schema.Struct({
    resourceType: Schema.optional(
      Schema.Union(Schema.compose(Schema.Trim, Schema.NonEmptyString), EmptyStringAsUndefinedSchema),
    ),
    resourceTypeGeneral: Schema.optional(Schema.compose(Schema.Trim, Schema.NonEmptyString)),
  }),
  relatedIdentifiers: Schema.Array(
    Schema.Struct({
      relationType: Schema.compose(Schema.Trim, Schema.NonEmptyString),
      relatedIdentifier: Schema.compose(Schema.Trim, Schema.NonEmptyString),
    }),
  ),
  descriptions: Schema.Array(
    Schema.Struct({
      description: Schema.compose(Schema.Trim, Schema.NonEmptyString),
      descriptionType: Schema.compose(Schema.Trim, Schema.NonEmptyString),
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
        [StatusCodes.NotFound]: response => new RecordIsNotFound({ cause: response }),
        orElse: response => new RecordIsUnavailable({ cause: response }),
      }),
    ),
    Effect.andThen(HttpClientResponse.schemaBodyJson(ResponseSchema(Record))),
    Effect.andThen(body => body.data.attributes),
    Effect.catchTags({
      ParseError: error => new RecordIsUnavailable({ cause: error }),
      ResponseError: error => new RecordIsUnavailable({ cause: error }),
    }),
    Effect.tapErrorTag('RecordIsUnavailable', error =>
      Effect.logError('Failed to get record from DataCite').pipe(Effect.annotateLogs({ error })),
    ),
  )
