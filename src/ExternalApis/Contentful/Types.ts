import { Schema } from 'effect'
import { NonEmptyStringSchema } from '../../types/NonEmptyString.ts'

const ContentfulIdBrand: unique symbol = Symbol.for('ContentfulId')

export type ContentfulId = typeof ContentfulId.Type

export const ContentfulId = Schema.String.pipe(Schema.pattern(/^[A-z0-9]+$/), Schema.brand(ContentfulIdBrand))

export class Entry extends Schema.Class<Entry>('Entry')({
  sys: Schema.Struct({
    id: ContentfulId,
    contentType: Schema.Struct({
      sys: Schema.Struct({
        type: Schema.Literal('Link'),
        linkType: Schema.Literal('ContentType'),
        id: ContentfulId,
      }),
    }),
  }),
  fields: Schema.Record({ key: ContentfulId, value: NonEmptyStringSchema }),
}) {}

export class Entries extends Schema.Class<Entries>('Entries')({
  items: Schema.Array(Entry),
}) {}
