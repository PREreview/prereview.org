import { Array, Data, Schema, Tuple, SchemaTransformation, Effect, Struct } from 'effect'
import { Doi, OrcidId, Temporal } from '../../types/index.ts'

const pluck = <Fields extends Schema.Struct.Fields, K extends keyof Fields & string>(
  schema: Schema.Struct<Fields>,
  key: K,
): Schema.Codec<
  Fields[K]['Type'],
  Readonly<Record<K, Fields[K]['Encoded']>>,
  Fields[K]['DecodingServices'],
  Fields[K]['EncodingServices']
> =>
  schema.mapFields(Struct.pick([key])).pipe(
    Schema.decodeTo(
      Schema.toType(schema.fields[key] as Schema.Top),
      SchemaTransformation.transform<unknown, Record<K, unknown>>({
        decode: whole => whole[key],
        encode: value => ({ [key]: value }) as Record<K, unknown>,
      }) as never,
    ),
  ) as never

const ValueFromTupleSchema = <A, I, R>(schema: Schema.Codec<A, I, R, R>): Schema.Codec<A, readonly [I], R, R> =>
  Schema.Tuple([schema]).pipe(
    Schema.decodeTo(
      Schema.toType(schema),
      SchemaTransformation.transform({ decode: Tuple.get(0), encode: value => [value] as const }),
    ),
  )

const PlainYearFromTupleSchema = ValueFromTupleSchema(Schema.Number)

const PlainYearMonthFromTupleSchema = Schema.Tuple([Schema.Number, Schema.Number]).pipe(
  Schema.decodeTo(
    Temporal.PlainYearMonthFromPartsSchema,
    SchemaTransformation.transform({
      decode: parts => ({ year: parts[0], month: parts[1] }),
      encode: parts => [parts.year, parts.month] as const,
    }),
  ),
)

const PlainDateFromTupleSchema = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]).pipe(
  Schema.decodeTo(
    Temporal.PlainDateFromPartsSchema,
    SchemaTransformation.transform({
      decode: parts => ({ year: parts[0], month: parts[1], day: parts[2] }),
      encode: parts => [parts.year, parts.month, parts.day] as const,
    }),
  ),
)

const PublishedSchema = pluck(
  Schema.Struct({
    'date-parts': ValueFromTupleSchema(
      Schema.Union([PlainYearFromTupleSchema, PlainYearMonthFromTupleSchema, PlainDateFromTupleSchema]),
    ),
  }),
  'date-parts',
)

export class Work extends Schema.Class<Work>('Work')({
  DOI: Doi.DoiSchema,
  resource: Schema.Struct({
    primary: Schema.Struct({
      URL: Schema.URLFromString,
    }),
  }),
  title: Schema.Union([Schema.Tuple([]), Schema.Tuple([Schema.String])]),
  abstract: Schema.optional(Schema.String),
  language: Schema.optional(Schema.String),
  author: Schema.Array(
    Schema.Union([
      Schema.Struct({
        ORCID: Schema.optional(OrcidId.OrcidIdFromUrlSchema),
        given: Schema.optional(Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim()))),
        family: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
      }),
      Schema.Struct({
        name: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
      }),
    ]),
  ).pipe(Schema.withDecodingDefaultType(Effect.sync(Array.empty))),
  institution: Schema.optional(Schema.Tuple([Schema.Struct({ name: Schema.String })])),
  published: PublishedSchema,
  'group-title': Schema.optional(
    Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
  ),
  type: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
  subtype: Schema.optional(Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim()))),
}) {}

export const WorkResponseSchema = pluck(Schema.Struct({ message: Work }), 'message')

export class WorkIsNotFound extends Data.TaggedError('WorkIsNotFound')<{ cause?: unknown }> {}

export class WorkIsUnavailable extends Data.TaggedError('WorkIsUnavailable')<{ cause?: unknown }> {}
