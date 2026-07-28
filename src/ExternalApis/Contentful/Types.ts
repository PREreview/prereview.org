import { Schema } from 'effect'
import { NonEmptyStringSchema } from '../../types/NonEmptyString.ts'

const ContentfulIdBrand: unique symbol = Symbol.for('ContentfulId')

export type ContentfulId = typeof ContentfulId.Type

export const ContentfulId = Schema.String.pipe(Schema.pattern(/^[A-z0-9]+$/), Schema.brand(ContentfulIdBrand))

class Text extends Schema.Class<Text>('Text')({
  nodeType: Schema.tag('text'),
  value: NonEmptyStringSchema,
}) {}

class Hyperlink extends Schema.Class<Hyperlink>('Hyperlink')({
  nodeType: Schema.tag('hyperlink'),
  data: Schema.Struct({ uri: NonEmptyStringSchema }),
  content: Schema.NonEmptyArray(Text),
}) {}

class Heading1 extends Schema.Class<Heading1>('Heading1')({
  nodeType: Schema.tag('heading-1'),
  content: Schema.NonEmptyArray(Text),
}) {}

class Paragraph extends Schema.Class<Paragraph>('Paragraph')({
  nodeType: Schema.tag('paragraph'),
  content: Schema.NonEmptyArray(Schema.Union(Text, Hyperlink)),
}) {}

class EmbeddedAssetBlock extends Schema.Class<EmbeddedAssetBlock>('EmbeddedAssetBlock')({
  nodeType: Schema.tag('embedded-asset-block'),
  data: Schema.Struct({
    target: Schema.Struct({
      sys: Schema.Struct({ id: ContentfulId, type: Schema.Literal('Link'), linkType: Schema.Literal('Asset') }),
    }),
  }),
}) {}

class Document extends Schema.Class<Document>('Document')({
  nodeType: Schema.tag('document'),
  content: Schema.NonEmptyArray(Schema.Union(Heading1, Paragraph, EmbeddedAssetBlock)),
}) {}

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
    locale: Schema.optional(Schema.NonEmptyString),
  }),
  fields: Schema.Record({
    key: ContentfulId,
    value: Schema.Union(
      Schema.Union(NonEmptyStringSchema, Document),
      Schema.Record({ key: NonEmptyStringSchema, value: Schema.Union(NonEmptyStringSchema, Document) }),
    ),
  }),
}) {}

class Asset extends Schema.Class<Asset>('Asset')({
  sys: Schema.Struct({
    id: ContentfulId,
    locale: Schema.optional(Schema.NonEmptyString),
  }),
  fields: Schema.Struct({
    title: Schema.Union(
      NonEmptyStringSchema,
      Schema.Record({ key: NonEmptyStringSchema, value: NonEmptyStringSchema }),
    ),
    file: Schema.Union(
      Schema.Struct({
        url: Schema.URL,
        details: Schema.Struct({ image: Schema.Struct({ width: Schema.Int, height: Schema.Int }) }),
      }),
      Schema.Record({
        key: NonEmptyStringSchema,
        value: Schema.Struct({
          url: Schema.URL,
          details: Schema.Struct({ image: Schema.Struct({ width: Schema.Int, height: Schema.Int }) }),
        }),
      }),
    ),
  }),
}) {}

export class Entries extends Schema.Class<Entries>('Entries')({
  items: Schema.Array(Entry),
  includes: Schema.optional(Schema.Struct({ Asset: Schema.NonEmptyArray(Asset) })),
}) {}
