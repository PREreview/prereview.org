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

export type DocumentType = Text | Hyperlink | Heading1 | Heading2 | Heading3 | Paragraph | EmbeddedAssetBlock

export type Mark = Bold | Italic

class Bold extends Schema.Class<Bold>('Bold')({
  _tag: Schema.propertySignature(Schema.transformLiteral('bold', 'Bold')).pipe(Schema.fromKey('type')),
}) {}

class Italic extends Schema.Class<Italic>('Italic')({
  _tag: Schema.propertySignature(Schema.transformLiteral('italic', 'Italic')).pipe(Schema.fromKey('type')),
}) {}

class Text extends Schema.Class<Text>('Text')({
  _tag: Schema.propertySignature(Schema.transformLiteral('text', 'Text')).pipe(Schema.fromKey('nodeType')),
  value: Schema.String,
  marks: Schema.Array(Schema.Union(Bold, Italic)),
}) {}

class Hyperlink extends Schema.Class<Hyperlink>('Hyperlink')({
  _tag: Schema.propertySignature(Schema.transformLiteral('hyperlink', 'Hyperlink')).pipe(Schema.fromKey('nodeType')),
  data: Schema.Struct({ uri: NonEmptyStringSchema }),
  content: Schema.NonEmptyArray(Text),
}) {}

class Heading1 extends Schema.Class<Heading1>('Heading1')({
  _tag: Schema.propertySignature(Schema.transformLiteral('heading-1', 'Heading1')).pipe(Schema.fromKey('nodeType')),
  content: Schema.NonEmptyArray(Text),
}) {}

class Heading2 extends Schema.Class<Heading2>('Heading2')({
  _tag: Schema.propertySignature(Schema.transformLiteral('heading-2', 'Heading2')).pipe(Schema.fromKey('nodeType')),
  content: Schema.NonEmptyArray(Text),
}) {}

class Heading3 extends Schema.Class<Heading3>('Heading3')({
  _tag: Schema.propertySignature(Schema.transformLiteral('heading-3', 'Heading3')).pipe(Schema.fromKey('nodeType')),
  content: Schema.NonEmptyArray(Text),
}) {}

class Paragraph extends Schema.Class<Paragraph>('Paragraph')({
  _tag: Schema.propertySignature(Schema.transformLiteral('paragraph', 'Paragraph')).pipe(Schema.fromKey('nodeType')),
  content: Schema.NonEmptyArray(Schema.Union(Text, Hyperlink)),
}) {}

class Asset extends Schema.Class<Asset>('Asset')({
  sys: Schema.Struct({
    id: ContentfulId,
    locale: Schema.optional(Schema.NonEmptyString),
  }),
  fields: Schema.Struct({
    title: Schema.Record({ key: NonEmptyStringSchema, value: NonEmptyStringSchema }),
    file: Schema.Record({
      key: NonEmptyStringSchema,
      value: Schema.Struct({
        url: Schema.Union(ProtocolRelativeUrl, Schema.URL),
        details: Schema.Struct({ image: Schema.Struct({ width: Schema.Int, height: Schema.Int }) }),
      }),
    }),
  }),
}) {}

class EmbeddedAssetBlock extends Schema.Class<EmbeddedAssetBlock>('EmbeddedAssetBlock')({
  _tag: Schema.propertySignature(Schema.transformLiteral('embedded-asset-block', 'EmbeddedAssetBlock')).pipe(
    Schema.fromKey('nodeType'),
  ),
  data: Schema.Struct({ target: Asset }),
}) {}

export class Document extends Schema.Class<Document>('Document')({
  _tag: Schema.propertySignature(Schema.transformLiteral('document', 'Document')).pipe(Schema.fromKey('nodeType')),
  content: Schema.NonEmptyArray(Schema.Union(Heading1, Heading2, Heading3, Paragraph, EmbeddedAssetBlock)),
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
  }),
  fields: Schema.Record({
    key: ContentfulId,
    value: Schema.Record({ key: NonEmptyStringSchema, value: Schema.Union(NonEmptyStringSchema, Document) }),
  }),
}) {}

export class Entries extends Schema.Class<Entries>('Entries')({
  items: Schema.Array(Entry),
}) {}
