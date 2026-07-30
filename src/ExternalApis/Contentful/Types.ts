import { Schema } from 'effect'
import { NonEmptyStringSchema } from '../../types/NonEmptyString.ts'

const ProtocolRelativeUrl = Schema.transform(Schema.String.pipe(Schema.pattern(/^\/\//)), Schema.URL, {
  strict: true,
  decode: value => `https:${value}`,
  encode: url => url.replace(/^[A-z][A-z0-9+.-]*:\/\//, '//'),
})

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
        url: Schema.Union(ProtocolRelativeUrl, Schema.URL),
        details: Schema.Struct({ image: Schema.Struct({ width: Schema.Int, height: Schema.Int }) }),
      }),
      Schema.Record({
        key: NonEmptyStringSchema,
        value: Schema.Struct({
          url: Schema.Union(ProtocolRelativeUrl, Schema.URL),
          details: Schema.Struct({ image: Schema.Struct({ width: Schema.Int, height: Schema.Int }) }),
        }),
      }),
    ),
  }),
}) {}

class EmbeddedAssetBlock extends Schema.Class<EmbeddedAssetBlock>('EmbeddedAssetBlock')({
  nodeType: Schema.tag('embedded-asset-block'),
  data: Schema.Struct({ target: Asset }),
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

export class Entries extends Schema.Class<Entries>('Entries')({
  items: Schema.Array(Entry),
}) {}
