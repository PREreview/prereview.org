import { Array, Data, Schema, Tuple } from 'effect'
import { Doi, OrcidId, Temporal } from '../../types/index.ts'

const ValueFromTupleSchema = <A, I, R>(schema: Schema.Schema<A, I, R>): Schema.Schema<A, readonly [I], R> =>
  Schema.transform(Schema.Tuple(schema), Schema.typeSchema(schema), {
    strict: true,
    decode: Tuple.at(0),
    encode: value => Tuple.make(value),
  })

const PlainYearFromTupleSchema = ValueFromTupleSchema(Schema.Number)

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

const PublishedSchema = Schema.pluck(
  Schema.Struct({
    'date-parts': ValueFromTupleSchema(
      Schema.Union(PlainYearFromTupleSchema, PlainYearMonthFromTupleSchema, PlainDateFromTupleSchema),
    ),
  }),
  'date-parts',
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
  language: Schema.optional(Schema.String),
  author: Schema.optionalWith(
    Schema.Array(
      Schema.Union(
        Schema.Struct({
          ORCID: Schema.optional(OrcidId.OrcidIdFromUrlSchema),
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

export const WorkResponseSchema = Schema.pluck(Schema.Struct({ message: Work }), 'message')

export class WorkIsNotFound extends Data.TaggedError('WorkIsNotFound')<{ cause?: unknown }> {}

export class WorkIsUnavailable extends Data.TaggedError('WorkIsUnavailable')<{ cause?: unknown }> {}
