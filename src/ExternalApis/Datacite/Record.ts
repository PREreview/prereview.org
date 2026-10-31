import {
  Array,
  Data,
  Function,
  Schema,
  String,
  SchemaTransformation,
  Effect,
  Option,
  Predicate,
  SchemaGetter,
  Struct,
  Number,
  SchemaIssue,
} from 'effect'
import { Doi, Temporal } from '../../types/index.ts'

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

const pluck = <Fields extends Schema.Struct.Fields, K extends keyof Fields & string>(
  schema: Schema.Struct<Fields>,
  key: K,
): Schema.Codec<
  Fields[K]['Type'],
  Readonly<globalThis.Record<K, Fields[K]['Encoded']>>,
  Fields[K]['DecodingServices'],
  Fields[K]['EncodingServices']
> =>
  schema.mapFields(Struct.pick([key])).pipe(
    Schema.decodeTo(
      Schema.toType(schema.fields[key] as Schema.Top),
      SchemaTransformation.transform<unknown, globalThis.Record<K, unknown>>({
        decode: whole => whole[key],
        encode: value => ({ [key]: value }) as globalThis.Record<K, unknown>,
      }) as never,
    ),
  ) as never

const EmptyStringAsUndefinedSchema = Schema.Trim.pipe(Schema.decodeTo(Schema.Literal(''))).pipe(
  Schema.decodeTo(
    Schema.Undefined,
    SchemaTransformation.transform({ decode: Function.constUndefined, encode: Function.constant(String.empty) }),
  ),
)

const DataIdSchema = pluck(
  Schema.Struct({
    data: pluck(
      Schema.Struct({ id: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())) }),
      'id',
    ),
  }),
  'data',
)

const DateSchema = Schema.Union([
  Temporal.InstantSchema,
  Temporal.PlainDateSchema,
  Temporal.PlainYearMonthSchema,
  NumberFromStringSchema,
])

const DateRangeSchema = Schema.Union([
  Schema.TemplateLiteralParser([DateSchema, '/', DateSchema]),
  Schema.TemplateLiteralParser([DateSchema, '/']),
  Schema.TemplateLiteralParser(['/', DateSchema]),
])

export class Record extends Schema.Class<Record>('Record')({
  doi: Doi.DoiSchema,
  creators: Schema.Array(
    Schema.Union([
      Schema.Struct({
        givenName: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
        familyName: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
        nameIdentifiers: Schema.Array(
          Schema.Struct({
            nameIdentifier: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
            nameIdentifierScheme: Schema.String.pipe(
              Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim()),
            ),
          }),
        ).pipe(Schema.withDecodingDefaultType(Effect.sync(Array.empty))),
      }),
      Schema.Struct({
        name: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
        nameIdentifiers: Schema.Array(
          Schema.Struct({
            nameIdentifier: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
            nameIdentifierScheme: Schema.String.pipe(
              Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim()),
            ),
          }),
        ).pipe(Schema.withDecodingDefaultType(Effect.sync(Array.empty))),
      }),
    ]),
  ).pipe(Schema.withDecodingDefaultType(Effect.sync(Array.empty))),
  titles: Schema.NonEmptyArray(
    Schema.Struct({
      title: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
    }),
  ),
  publisher: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
  dates: Schema.NonEmptyArray(
    Schema.Struct({
      date: Schema.Union([DateSchema, DateRangeSchema]),
      dateType: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
    }),
  ),
  language: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.decodeTo(Schema.optional(Schema.String), {
      decode: SchemaGetter.transformOptional(Option.filter(Predicate.isNotNull)),
      encode: SchemaGetter.passthroughSubtype(),
    }),
  ),
  types: Schema.Struct({
    resourceType: Schema.optional(
      Schema.Union([
        Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
        EmptyStringAsUndefinedSchema,
      ]),
    ),
    resourceTypeGeneral: Schema.optional(
      Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
    ),
  }),
  relatedIdentifiers: Schema.Array(
    Schema.Struct({
      relationType: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
      relatedIdentifier: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
    }),
  ),
  descriptions: Schema.Array(
    Schema.Struct({
      description: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
      descriptionType: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
    }),
  ),
  url: Schema.URLFromString,
  relationships: Schema.Struct({
    provider: DataIdSchema,
  }),
}) {}

export const RecordResponseSchema = pluck(
  Schema.Struct({
    data: Schema.Struct({
      attributes: Schema.toEncoded(Schema.Struct(Struct.omit(Record.fields, ['relationships']))),
      relationships: Schema.toEncoded(Record.fields.relationships),
    }).pipe(
      Schema.decodeTo(
        Record,
        SchemaTransformation.transform({
          decode: ({ attributes, relationships }) => ({ ...attributes, relationships }),
          encode: ({ relationships, ...attributes }) => ({ attributes, relationships }),
        }),
      ),
    ),
  }),
  'data',
)

export class RecordIsNotFound extends Data.TaggedError('RecordIsNotFound')<{ cause?: unknown }> {}

export class RecordIsUnavailable extends Data.TaggedError('RecordIsUnavailable')<{ cause?: unknown }> {}
