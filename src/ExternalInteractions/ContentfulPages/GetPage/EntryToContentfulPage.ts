import {
  Array,
  Effect,
  flow,
  Match,
  Option,
  type ParseResult,
  pipe,
  Predicate,
  Record,
  Schema,
  type Types,
} from 'effect'
import { Locale } from '../../../Context.ts'
import {
  Asset,
  type Block,
  ContentfulId,
  Document,
  type Entry,
  type Inline,
  type Mark,
  type Text,
} from '../../../ExternalApis/Contentful/index.ts'
import { type Html, html } from '../../../html.ts'
import { DefaultLocale, type SupportedLocale } from '../../../locales/index.ts'
import { SlugSchema } from '../../../types/Slug.ts'
import { ContentfulPage } from '../Types.ts'

const PageEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('page')) }) }),
  }),
  fields: Schema.Struct({
    title: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
    content: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Document }),
  }),
})

const PageSlugEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('page')) }) }),
  }),
  fields: Schema.Struct({
    slug: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: SlugSchema }),
  }),
})

const CallToActionEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('callToAction')) }) }),
  }),
  fields: Schema.Struct({
    text: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
    url: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.URL }),
  }),
}).pipe(Schema.attachPropertySignature('_tag', 'CallToActionEntry'))

const DynamicEmbedEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('dynamicEmbed')) }) }),
  }),
  fields: Schema.Struct({
    key: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
  }),
}).pipe(Schema.attachPropertySignature('_tag', 'DynamicEmbedEntry'))

const MediaEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('media')) }) }),
  }),
  fields: Schema.Struct({
    file: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.typeSchema(Asset) }),
  }),
}).pipe(Schema.attachPropertySignature('_tag', 'MediaEntry'))

const PageEntryToContentfulPage = Effect.fnUntraced(function* (entry: typeof PageEntry.Type) {
  const locale = yield* Locale

  return new ContentfulPage({
    title: Option.match(getValueForLocale(entry.fields.title, locale), {
      onSome: title => html`${title}`,
      onNone: () => html`${getValueForDefaultLocale(entry.fields.title)}`,
    }),
    html: Option.match(getValueForLocale(entry.fields.content, locale), {
      onSome: content => html`${BlockContentToHtml(content)}`,
      onNone: () => html`${BlockContentToHtml(getValueForDefaultLocale(entry.fields.content))}`,
    }),
    locale: Option.match(getValueForLocale(entry.fields.title, locale), {
      onSome: () => locale,
      onNone: () => DefaultLocale,
    }),
  })
})

export const EntryToContentfulPage: (entry: Entry) => Effect.Effect<ContentfulPage, ParseResult.ParseError, Locale> =
  flow(Schema.decodeUnknown(Schema.typeSchema(PageEntry)), Effect.andThen(PageEntryToContentfulPage))

const EmbeddedEntry = Schema.Union(CallToActionEntry, DynamicEmbedEntry, MediaEntry)

const EmbeddedEntryToHtml = Match.typeTags<typeof EmbeddedEntry.Type, Html>()({
  CallToActionEntry: callToAction =>
    html`<a href="${getValueForDefaultLocale(callToAction.fields.url).href}" class="button"
      >${getValueForDefaultLocale(callToAction.fields.text)}</a
    >`,
  DynamicEmbedEntry: dynamicEmbed => html`{{${getValueForDefaultLocale(dynamicEmbed.fields.key)}}}`,
  MediaEntry: media => {
    const file = getValueForDefaultLocale(media.fields.file)
    const asset = getValueForDefaultLocale(file.fields.file)

    return html`
      <img src="${asset.url.href}" width="${asset.details.image.width}" height="${asset.details.image.height}" alt="" />
    `
  },
})

const BlockElementToHtml = Match.typeTags<Block, Option.Option<Html>>()({
  Document: document => Option.some(html`${BlockContentToHtml(document)}`),
  EmbeddedAssetBlock: embeddedAssetBlock => {
    const file = getValueForDefaultLocale(embeddedAssetBlock.data.target.fields.file)

    return Option.some(
      html`<img
        src="${file.url.href}"
        width="${file.details.image.width}"
        height="${file.details.image.height}"
        alt=""
      />`,
    )
  },
  EmbeddedEntryBlock: embeddedEntryBlock =>
    pipe(Schema.decodeUnknownSync(EmbeddedEntry)(embeddedEntryBlock.data.target), EmbeddedEntryToHtml, Option.some),
  Heading1: heading1 => Option.some(html`<h1><span>${BlockContentToHtml(heading1)}</span></h1>`),
  Heading2: heading2 => Option.some(html`<h2><span>${BlockContentToHtml(heading2)}</span></h2> `),
  Heading3: heading3 => Option.some(html`<h3><span>${BlockContentToHtml(heading3)}</span></h3>`),
  ListItem: listItem =>
    Option.some(html`<li><span>${BlockContentToHtmlSkippingOverSingleParagraph(listItem)}</span></li>`),
  OrderedList: orderedList =>
    Option.some(
      html`<ol>
        ${BlockContentToHtml(orderedList)}
      </ol>`,
    ),
  Paragraph: paragraph =>
    Array.match(BlockContentToHtml(paragraph), {
      onEmpty: () => Option.none(),
      onNonEmpty: content => Option.some(html`<p><span>${content}</span></p>`),
    }),
  Table: table =>
    Option.some(
      html`<table>
        ${BlockContentToHtml(table)}
      </table>`,
    ),
  TableRow: tableRow =>
    Option.some(
      html`<tr>
        ${BlockContentToHtml(tableRow)}
      </tr>`,
    ),
  TableCell: tableCell =>
    Option.some(html`<td><span>${BlockContentToHtmlSkippingOverSingleParagraph(tableCell)}</span></td>`),
  TableHeaderCell: tableHeaderCell =>
    Option.some(html`<th><span>${BlockContentToHtmlSkippingOverSingleParagraph(tableHeaderCell)}</span></th>`),
  UnorderedList: unorderedList =>
    Option.some(
      html`<ul>
        ${BlockContentToHtml(unorderedList)}
      </ul>`,
    ),
})

const BlockContentToHtml = (
  block: Types.ExcludeTag<Block, 'EmbeddedAssetBlock' | 'EmbeddedEntryBlock'>,
): ReadonlyArray<Html> =>
  Array.filterMap(block.content, (element: Block | Inline | Text) => {
    if (element._tag === 'Text') {
      return TextToHtml(element)
    }

    if (element._tag === 'EntryHyperlink' || element._tag === 'Hyperlink') {
      return InlineElementToHtml(element)
    }

    return BlockElementToHtml(element)
  })

const BlockContentToHtmlSkippingOverSingleParagraph = (
  block: Types.ExcludeTag<Block, 'EmbeddedAssetBlock' | 'EmbeddedEntryBlock'>,
): ReadonlyArray<Html> => {
  if (block.content.length === 1 && block.content[0]._tag === 'Paragraph') {
    return BlockContentToHtml(block.content[0])
  }

  return BlockContentToHtml(block)
}

const InlineElementToHtml = Match.typeTags<Inline, Option.Option<Html>>()({
  EntryHyperlink: hyperlink => {
    const target = Schema.decodeUnknownSync(PageSlugEntry)(hyperlink.data.target)

    return Option.some(
      html`<a href="/${getValueForDefaultLocale(target.fields.slug)}">${InlineContentToHtml(hyperlink)}</a>`,
    )
  },
  Hyperlink: hyperlink =>
    Option.some(
      html`<a href="${hyperlink.data.uri.replace(/^https?:\/\/prereview\.org(?:\/|$)/, '/')}"
        >${InlineContentToHtml(hyperlink)}</a
      >`,
    ),
})

const InlineContentToHtml = (inline: Inline): ReadonlyArray<Html> => Array.filterMap(inline.content, TextToHtml)

const TextToHtml = (text: Text): Option.Option<Html> =>
  text.value === '' ? Option.none() : Option.some(Array.reduce(text.marks, html`${text.value}`, MarkToHtml))

const MarkToHtml: (text: Html, mark: Mark) => Html = (text, mark) =>
  Match.valueTags(mark, {
    Bold: () => html`<b>${text}</b>`,
    Italic: () => html`<i>${text}</i>`,
  })

const getValueForLocale = <T>(values: Record<string, T | undefined>, locale: SupportedLocale): Option.Option<T> =>
  pipe(Record.get(values, locale), Option.filter(Predicate.isNotUndefined))

const getValueForDefaultLocale = <T>(values: Record<string, T | undefined>): T =>
  pipe(
    Record.get(values, DefaultLocale),
    Option.filter(Predicate.isNotUndefined),
    Option.getOrThrowWith(() => 'No locale available for a value'),
  )
