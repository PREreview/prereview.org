import { Schema, SchemaTransformation } from 'effect'
import { OrcidId, Temporal } from '../../types/index.ts'

export class Eprint extends Schema.Class<Eprint>('Eprint')({
  type: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
  eprintid: Schema.Int,
  date: Schema.optional(Schema.Union([Schema.Int, Temporal.PlainDateSchema, Temporal.PlainYearMonthSchema])),
  datestamp: Temporal.PlainDateTimeSchema,
  creators: Schema.NonEmptyArray(
    Schema.Struct({
      name: Schema.Struct({
        given: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
        family: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
      }),
      orcid: Schema.optional(OrcidId.OrcidIdSchema),
    }),
  ),
  title: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
  abstract: Schema.optional(Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim()))),
  uri: Schema.URLFromString,
}) {}
