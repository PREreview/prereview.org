import { Array, Effect, Match, Option, ParseResult, pipe, Predicate, Record, Schema } from 'effect'
import { Locale } from '../../../Context.ts'
import {
  Asset,
  type Block,
  ContentfulId,
  Document,
  type Inline,
  type Mark,
  type Text,
} from '../../../ExternalApis/Contentful/index.ts'
import { Html, html } from '../../../html.ts'
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
})

const DynamicEmbedEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('dynamicEmbed')) }) }),
  }),
  fields: Schema.Struct({
    key: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
  }),
})

const MediaEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('media')) }) }),
  }),
  fields: Schema.Struct({
    file: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.typeSchema(Asset) }),
  }),
})

const PageEntryToContentfulPage = Effect.fnUntraced(function* (entry: typeof PageEntry.Type) {
  const locale = yield* Locale

  return new ContentfulPage({
    title: Option.match(getValueForLocale(entry.fields.title, locale), {
      onSome: title => html`${title}`,
      onNone: () => html`${getValueForDefaultLocale(entry.fields.title)}`,
    }),
    html: Option.match(getValueForLocale(entry.fields.content, locale), {
      onSome: content => html`${ContentToHtml(content)}`,
      onNone: () => html`${ContentToHtml(getValueForDefaultLocale(entry.fields.content))}`,
    }),
    locale: Option.match(getValueForLocale(entry.fields.title, locale), {
      onSome: () => locale,
      onNone: () => DefaultLocale,
    }),
  })
})

export const EntryToContentfulPage = Schema.transformOrFail(
  Schema.typeSchema(PageEntry),
  Schema.typeSchema(ContentfulPage),
  {
    strict: true,
    decode: PageEntryToContentfulPage,
    encode: (page, _, ast) =>
      ParseResult.fail(new ParseResult.Forbidden(ast, page, 'Encoding pages back to an entry is forbidden.')),
  },
)

const HtmlFromSelfSchema = Schema.instanceOf(Html)

const CallToActionEntryToHtml = Schema.transformOrFail(CallToActionEntry, HtmlFromSelfSchema, {
  strict: true,
  decode: callToAction =>
    ParseResult.succeed(
      html`<a href="${getValueForDefaultLocale(callToAction.fields.url).href}" class="button"
        >${getValueForDefaultLocale(callToAction.fields.text)}</a
      >`,
    ),
  encode: (page, _, ast) =>
    ParseResult.fail(new ParseResult.Forbidden(ast, page, 'Encoding back to an embedded entry is forbidden.')),
})

const DynamicEmbedEntryToHtml = Schema.transformOrFail(DynamicEmbedEntry, HtmlFromSelfSchema, {
  strict: true,
  decode: dynamicEmbed => ParseResult.succeed(html`{{${getValueForDefaultLocale(dynamicEmbed.fields.key)}}}`),
  encode: (page, _, ast) =>
    ParseResult.fail(new ParseResult.Forbidden(ast, page, 'Encoding back to an embedded entry is forbidden.')),
})

const MediaEntryToHtml = Schema.transformOrFail(MediaEntry, HtmlFromSelfSchema, {
  strict: true,
  decode: media => {
    const file = getValueForDefaultLocale(media.fields.file)
    const asset = getValueForDefaultLocale(file.fields.file)

    return ParseResult.succeed(html`
      <img src="${asset.url.href}" width="${asset.details.image.width}" height="${asset.details.image.height}" alt="" />
    `)
  },
  encode: (page, _, ast) =>
    ParseResult.fail(new ParseResult.Forbidden(ast, page, 'Encoding back to an embedded entry is forbidden.')),
})

const EmbeddedEntryToHtml = Schema.Union(CallToActionEntryToHtml, DynamicEmbedEntryToHtml, MediaEntryToHtml)

const ElementToHtml = Match.typeTags<Block | Inline | Text, Option.Option<Html>>()({
  Document: document => Option.some(html`${ContentToHtml(document)}`),
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
    Option.fromNullable(Schema.decodeUnknownSync(EmbeddedEntryToHtml)(embeddedEntryBlock.data.target)),
  EntryHyperlink: hyperlink => {
    const target = Schema.decodeUnknownSync(PageSlugEntry)(hyperlink.data.target)

    return Option.some(html`<a href="/${getValueForDefaultLocale(target.fields.slug)}">${ContentToHtml(hyperlink)}</a>`)
  },
  Heading1: heading1 => Option.some(html`<h1><span>${ContentToHtml(heading1)}</span></h1>`),
  Heading2: heading2 => Option.some(html`<h2><span>${ContentToHtml(heading2)}</span></h2> `),
  Heading3: heading3 => Option.some(html`<h3><span>${ContentToHtml(heading3)}</span></h3>`),
  Hyperlink: hyperlink =>
    Option.some(
      html`<a href="${hyperlink.data.uri.replace(/^https?:\/\/prereview\.org(?:\/|$)/, '/')}"
        >${ContentToHtml(hyperlink)}</a
      >`,
    ),
  ListItem: listItem => Option.some(html`<li><span>${ContentToHtmlSkippingOverSingleParagraph(listItem)}</span></li>`),
  OrderedList: orderedList =>
    Option.some(
      html`<ol>
        ${ContentToHtml(orderedList)}
      </ol>`,
    ),
  Paragraph: paragraph =>
    Array.match(ContentToHtml(paragraph), {
      onEmpty: () => Option.none(),
      onNonEmpty: content => Option.some(html`<p><span>${content}</span></p>`),
    }),
  Table: table =>
    Option.some(
      html`<table>
        ${ContentToHtml(table)}
      </table>`,
    ),
  TableRow: tableRow =>
    Option.some(
      html`<tr>
        ${ContentToHtml(tableRow)}
      </tr>`,
    ),
  TableCell: tableCell =>
    Option.some(html`<td><span>${ContentToHtmlSkippingOverSingleParagraph(tableCell)}</span></td>`),
  TableHeaderCell: tableHeaderCell =>
    Option.some(html`<th><span>${ContentToHtmlSkippingOverSingleParagraph(tableHeaderCell)}</span></th>`),
  Text: text =>
    text.value === '' ? Option.none() : Option.some(Array.reduce(text.marks, html`${text.value}`, MarkToHtml)),
  UnorderedList: unorderedList =>
    Option.some(
      html`<ul>
        ${ContentToHtml(unorderedList)}
      </ul>`,
    ),
})

const ContentToHtml = ({ content }: Extract<Block | Inline, { content: unknown }>): ReadonlyArray<Html> =>
  Array.filterMap(content, ElementToHtml)

const ContentToHtmlSkippingOverSingleParagraph = (block: Extract<Block, { content: unknown }>): ReadonlyArray<Html> => {
  if (block.content.length === 1 && block.content[0]._tag === 'Paragraph') {
    return ContentToHtml(block.content[0])
  }

  return ContentToHtml(block)
}

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
