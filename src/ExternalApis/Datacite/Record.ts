import { Array, Data, Function, Schema, String } from 'effect'
import { Doi, Temporal } from '../../types/index.ts'

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

export const RecordResponseSchema = Schema.pluck(
  Schema.Struct({ data: Schema.pluck(Schema.Struct({ attributes: Record }), 'attributes') }),
  'data',
)

export class RecordIsNotFound extends Data.TaggedError('RecordIsNotFound')<{ cause?: unknown }> {}

export class RecordIsUnavailable extends Data.TaggedError('RecordIsUnavailable')<{ cause?: unknown }> {}
