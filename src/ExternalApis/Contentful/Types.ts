import { type Array, Schema, SchemaTransformation } from 'effect'
import { type NonEmptyString, NonEmptyStringSchema } from '../../types/NonEmptyString.ts'
import { type Instant, InstantSchema } from '../../types/Temporal.ts'

const ProtocolRelativeUrl = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\/\//)),
  Schema.decodeTo(
    Schema.URLFromString,
    SchemaTransformation.transform({
      decode: value => `https:${value}`,
      encode: url => url.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, '//'),
    }),
  ),
)

export type ContentfulId = typeof ContentfulId.Type

export const ContentfulId = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[A-Za-z0-9_-]+$/)),
  Schema.brand('ContentfulId'),
)

export type Block =
  | Document
  | Heading1
  | Heading2
  | Heading3
  | Paragraph
  | ListItem
  | OrderedList
  | UnorderedList
  | Table
  | TableRow
  | TableCell
  | TableHeaderCell
  | EmbeddedAssetBlock
  | EmbeddedEntryBlock
  | BlockQuote
  | HorizontalRule

export type Inline = EntryHyperlink | Hyperlink

export type Mark = Bold | Italic

class Bold extends Schema.Class<Bold>('Bold')({
  _tag: Schema.Literal('bold').transform('Bold'),
}) {}

const BoldSchema = Bold.pipe(Schema.encodeKeys({ _tag: 'type' }))

class Italic extends Schema.Class<Italic>('Italic')({
  _tag: Schema.Literal('italic').transform('Italic'),
}) {}

const ItalicSchema = Italic.pipe(Schema.encodeKeys({ _tag: 'type' }))

export class Text extends Schema.Class<Text>('Text')({
  _tag: Schema.Literal('text').transform('Text'),
  value: Schema.String,
  marks: Schema.Array(Schema.Union([BoldSchema, ItalicSchema])),
}) {}

const TextSchema = Text.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class Hyperlink extends Schema.Class<Hyperlink>('Hyperlink')({
  _tag: Schema.Literal('hyperlink').transform('Hyperlink'),
  data: Schema.Struct({ uri: NonEmptyStringSchema }),
  content: Schema.NonEmptyArray(TextSchema),
}) {}

const HyperlinkSchema = Hyperlink.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

export class EntryLink extends Schema.Class<EntryLink>('EntryLink')({
  sys: Schema.Struct({
    id: ContentfulId,
    type: Schema.Literal('Link'),
    linkType: Schema.Literal('Entry'),
  }),
}) {}

export class AssetLink extends Schema.Class<AssetLink>('AssetLink')({
  sys: Schema.Struct({
    id: ContentfulId,
    type: Schema.Literal('Link'),
    linkType: Schema.Literal('Asset'),
  }),
}) {}

class EntryHyperlink extends Schema.Class<EntryHyperlink>('EntryHyperlink')({
  _tag: Schema.Literal('entry-hyperlink').transform('EntryHyperlink'),
  data: Schema.Struct({
    target: Schema.suspend(
      (): Schema.Codec<Entry | EntryLink | '[Circular]'> =>
        Schema.Union([Entry, EntryLink, Schema.Literal('[Circular]')]) as never,
    ),
  }),
  content: Schema.NonEmptyArray(TextSchema),
}) {}

const EntryHyperlinkSchema = EntryHyperlink.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

export class Heading1 extends Schema.Class<Heading1>('Heading1')({
  _tag: Schema.Literal('heading-1').transform('Heading1'),
  content: Schema.NonEmptyArray(TextSchema),
}) {}

const Heading1Schema = Heading1.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

export class Heading2 extends Schema.Class<Heading2>('Heading2')({
  _tag: Schema.Literal('heading-2').transform('Heading2'),
  content: Schema.NonEmptyArray(TextSchema),
}) {}

const Heading2Schema = Heading2.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

export class Heading3 extends Schema.Class<Heading3>('Heading3')({
  _tag: Schema.Literal('heading-3').transform('Heading3'),
  content: Schema.NonEmptyArray(TextSchema),
}) {}

const Heading3Schema = Heading3.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class Paragraph extends Schema.Class<Paragraph>('Paragraph')({
  _tag: Schema.Literal('paragraph').transform('Paragraph'),
  content: Schema.NonEmptyArray(Schema.Union([TextSchema, HyperlinkSchema, EntryHyperlinkSchema])),
}) {}

const ParagraphSchema = Paragraph.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class ListItem extends Schema.Class<ListItem>('ListItem')({
  _tag: Schema.Literal('list-item').transform('ListItem'),
  content: Schema.NonEmptyArray(ParagraphSchema),
}) {}

const ListItemSchema = ListItem.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class OrderedList extends Schema.Class<OrderedList>('OrderedList')({
  _tag: Schema.Literal('ordered-list').transform('OrderedList'),
  content: Schema.NonEmptyArray(ListItemSchema),
}) {}

const OrderedListSchema = OrderedList.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class UnorderedList extends Schema.Class<UnorderedList>('UnorderedList')({
  _tag: Schema.Literal('unordered-list').transform('UnorderedList'),
  content: Schema.NonEmptyArray(ListItemSchema),
}) {}

const UnorderedListSchema = UnorderedList.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class TableHeaderCell extends Schema.Class<TableHeaderCell>('TableHeaderCell')({
  _tag: Schema.Literal('table-header-cell').transform('TableHeaderCell'),
  content: Schema.NonEmptyArray(Schema.Union([ParagraphSchema, OrderedListSchema, UnorderedListSchema])),
}) {}

const TableHeaderCellSchema = TableHeaderCell.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class TableCell extends Schema.Class<TableCell>('TableCell')({
  _tag: Schema.Literal('table-cell').transform('TableCell'),
  content: Schema.NonEmptyArray(Schema.Union([ParagraphSchema])),
}) {}

const TableCellSchema = TableCell.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class TableRow extends Schema.Class<TableRow>('TableRow')({
  _tag: Schema.Literal('table-row').transform('TableRow'),
  content: Schema.NonEmptyArray(Schema.Union([TableHeaderCellSchema, TableCellSchema])),
}) {}

const TableRowSchema = TableRow.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class Table extends Schema.Class<Table>('Table')({
  _tag: Schema.Literal('table').transform('Table'),
  content: Schema.NonEmptyArray(TableRowSchema),
}) {}

const TableSchema = Table.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

export class ImageAsset extends Schema.Class<ImageAsset>('ImageAsset')({
  sys: Schema.Struct({
    id: ContentfulId,
    locale: Schema.optional(Schema.NonEmptyString),
  }),
  fields: Schema.Struct({
    title: Schema.Record(NonEmptyStringSchema, NonEmptyStringSchema),
    file: Schema.Record(
      NonEmptyStringSchema,
      Schema.Struct({
        url: Schema.Union([ProtocolRelativeUrl, Schema.URLFromString]),
        details: Schema.Struct({ image: Schema.Struct({ width: Schema.Int, height: Schema.Int }) }),
        contentType: Schema.TemplateLiteral(['image/', Schema.String]),
      }),
    ),
  }),
}) {
  readonly _tag = 'ImageAsset'
}

export class VideoAsset extends Schema.Class<VideoAsset>('VideoAsset')({
  sys: Schema.Struct({
    id: ContentfulId,
    locale: Schema.optional(Schema.NonEmptyString),
  }),
  fields: Schema.Struct({
    title: Schema.Record(NonEmptyStringSchema, NonEmptyStringSchema),
    file: Schema.Record(
      NonEmptyStringSchema,
      Schema.Struct({
        url: Schema.Union([ProtocolRelativeUrl, Schema.URLFromString]),
        contentType: Schema.TemplateLiteral(['video/', Schema.String]),
      }),
    ),
  }),
}) {
  readonly _tag = 'VideoAsset'
}

export type Asset = typeof Asset.Type

export const Asset = Schema.Union([ImageAsset, VideoAsset])

class EmbeddedAssetBlock extends Schema.Class<EmbeddedAssetBlock>('EmbeddedAssetBlock')({
  _tag: Schema.Literal('embedded-asset-block').transform('EmbeddedAssetBlock'),
  data: Schema.Struct({ target: Schema.Union([Asset, AssetLink]) }),
}) {}

const EmbeddedAssetBlockSchema = EmbeddedAssetBlock.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class EmbeddedEntryBlock extends Schema.Class<EmbeddedEntryBlock>('EmbeddedEntryBlock')({
  _tag: Schema.Literal('embedded-entry-block').transform('EmbeddedEntryBlock'),
  data: Schema.Struct({
    target: Schema.suspend(
      (): Schema.Codec<Entry | EntryLink | '[Circular]'> =>
        Schema.Union([Entry, EntryLink, Schema.Literal('[Circular]')]) as never,
    ),
  }),
}) {}

const EmbeddedEntryBlockSchema = EmbeddedEntryBlock.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class BlockQuote extends Schema.Class<BlockQuote>('BlockQuote')({
  _tag: Schema.Literal('blockquote').transform('BlockQuote'),
  content: Schema.NonEmptyArray(Schema.Union([ParagraphSchema])),
}) {}

const BlockQuoteSchema = BlockQuote.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

class HorizontalRule extends Schema.Class<HorizontalRule>('HorizontalRule')({
  _tag: Schema.Literal('hr').transform('HorizontalRule'),
}) {}

const HorizontalRuleSchema = HorizontalRule.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

export class Document extends Schema.Class<Document>('Document')({
  _tag: Schema.Literal('document').transform('Document'),
  content: Schema.NonEmptyArray(
    Schema.Union([
      Heading1Schema,
      Heading2Schema,
      Heading3Schema,
      ParagraphSchema,
      OrderedListSchema,
      UnorderedListSchema,
      TableSchema,
      EmbeddedAssetBlockSchema,
      EmbeddedEntryBlockSchema,
      BlockQuoteSchema,
      HorizontalRuleSchema,
    ]),
  ),
}) {}

const DocumentSchema = Document.pipe(Schema.encodeKeys({ _tag: 'nodeType' }))

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
    createdAt: InstantSchema,
  }),
  fields: Schema.Record(
    ContentfulId,
    Schema.Record(
      NonEmptyStringSchema,
      Schema.suspend(
        (): Schema.Codec<
          | Instant
          | NonEmptyString
          | Document
          | Asset
          | AssetLink
          | Entry
          | EntryLink
          | Array.NonEmptyReadonlyArray<Entry | EntryLink>
          | Array.NonEmptyReadonlyArray<NonEmptyString>,
          unknown
        > =>
          Schema.Union([
            InstantSchema,
            NonEmptyStringSchema,
            DocumentSchema,
            Asset,
            AssetLink,
            Entry,
            EntryLink,
            Schema.NonEmptyArray(Schema.Union([Entry, EntryLink])),
            Schema.NonEmptyArray(NonEmptyStringSchema),
          ]) as never,
      ),
    ),
  ),
}) {}

export class Entries extends Schema.Class<Entries>('Entries')({
  total: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  items: Schema.Array(Entry),
}) {}

export class Assets extends Schema.Class<Assets>('Assets')({
  total: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  items: Schema.Array(Asset),
}) {}

export type ContentfulErrorResponse = typeof ContentfulErrorResponse.Type

export const ContentfulErrorResponse = Schema.Struct({
  sys: Schema.Struct({ type: Schema.Literal('Error'), id: Schema.String }),
  message: Schema.String,
  details: Schema.optional(Schema.Unknown),
  requestId: Schema.optional(Schema.String),
})
