import { Schema } from 'effect'
import { Orcid, Temporal } from '../../types/index.js'

export class Eprint extends Schema.Class<Eprint>('Eprint')({
  type: Schema.compose(Schema.Trim, Schema.NonEmptyString),
  eprintid: Schema.Int,
  date: Schema.optional(Schema.Union(Schema.Int, Temporal.PlainDateSchema, Temporal.PlainYearMonthSchema)),
  datestamp: Temporal.PlainDateTimeSchema,
  creators: Schema.NonEmptyArray(
    Schema.Struct({
      name: Schema.Struct({
        given: Schema.compose(Schema.Trim, Schema.NonEmptyString),
        family: Schema.compose(Schema.Trim, Schema.NonEmptyString),
      }),
      orcid: Schema.optional(Orcid.OrcidSchema),
    }),
  ),
  title: Schema.compose(Schema.Trim, Schema.NonEmptyString),
  abstract: Schema.optional(Schema.compose(Schema.Trim, Schema.NonEmptyString)),
  uri: Schema.URL,
}) {}
