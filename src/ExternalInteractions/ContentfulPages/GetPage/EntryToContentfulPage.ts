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
import { DynamicEmbed, DynamicEmbedder } from '../DynamicEmbedder.ts'
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
    key: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: DynamicEmbed }),
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
    html: yield* Option.match(getValueForLocale(entry.fields.content, locale), {
      onSome: content => Effect.map(BlockContentToHtml(content), content => html`${content}`),
      onNone: () =>
        Effect.map(BlockContentToHtml(getValueForDefaultLocale(entry.fields.content)), content => html`${content}`),
    }),
    locale: Option.match(getValueForLocale(entry.fields.title, locale), {
      onSome: () => locale,
      onNone: () => DefaultLocale,
    }),
  })
})

export const EntryToContentfulPage: (
  entry: Entry,
) => Effect.Effect<ContentfulPage, ParseResult.ParseError, DynamicEmbedder | Locale> = flow(
  Schema.decodeUnknown(Schema.typeSchema(PageEntry)),
  Effect.andThen(PageEntryToContentfulPage),
)

const EmbeddedEntry = Schema.Union(CallToActionEntry, DynamicEmbedEntry, MediaEntry)

const EmbeddedEntryToHtml = Match.typeTags<
  typeof EmbeddedEntry.Type,
  Effect.Effect<Html, never, DynamicEmbedder | Locale>
>()({
  CallToActionEntry: Effect.fnUntraced(function* (callToAction) {
    const locale = yield* Locale

    const text = Option.getOrElse(getValueForLocale(callToAction.fields.text, locale), () =>
      getValueForDefaultLocale(callToAction.fields.text),
    )

    return html`<a href="${getValueForDefaultLocale(callToAction.fields.url).href}" class="button">${text}</a>`
  }),
  DynamicEmbedEntry: Effect.fnUntraced(function* (dynamicEmbed) {
    const dynamicEmbedded = yield* DynamicEmbedder

    return yield* dynamicEmbedded[getValueForDefaultLocale(dynamicEmbed.fields.key)]
  }),
  MediaEntry: media => {
    const file = getValueForDefaultLocale(media.fields.file)
    const asset = getValueForDefaultLocale(file.fields.file)

    return Effect.succeed(html`
      <img src="${asset.url.href}" width="${asset.details.image.width}" height="${asset.details.image.height}" alt="" />
    `)
  },
})

const BlockElementToHtml = Match.typeTags<
  Block,
  Effect.Effect<Option.Option<Html>, ParseResult.ParseError, DynamicEmbedder | Locale>
>()({
  Document: document => Effect.map(BlockContentToHtml(document), content => Option.some(html`${content}`)),
  EmbeddedAssetBlock: embeddedAssetBlock => {
    const file = getValueForDefaultLocale(embeddedAssetBlock.data.target.fields.file)

    return Effect.succeedSome(
      html`<img
        src="${file.url.href}"
        width="${file.details.image.width}"
        height="${file.details.image.height}"
        alt=""
      />`,
    )
  },
  EmbeddedEntryBlock: embeddedEntryBlock =>
    pipe(
      Schema.decodeUnknown(EmbeddedEntry)(embeddedEntryBlock.data.target),
      Effect.andThen(EmbeddedEntryToHtml),
      Effect.asSome,
    ),
  Heading1: heading1 =>
    Effect.map(BlockContentToHtml(heading1), content => Option.some(html`<h1><span>${content}</span></h1>`)),
  Heading2: heading2 =>
    Effect.map(BlockContentToHtml(heading2), content => Option.some(html`<h2><span>${content}</span></h2> `)),
  Heading3: heading3 =>
    Effect.map(BlockContentToHtml(heading3), content => Option.some(html`<h3><span>${content}</span></h3>`)),
  ListItem: listItem =>
    Effect.map(BlockContentToHtmlSkippingOverSingleParagraph(listItem), content =>
      Option.some(html`<li><span>${content}</span></li>`),
    ),
  OrderedList: orderedList =>
    Effect.map(BlockContentToHtml(orderedList), content =>
      Option.some(
        html`<ol>
          ${content}
        </ol>`,
      ),
    ),
  Paragraph: paragraph =>
    Effect.map(BlockContentToHtml(paragraph), content =>
      Array.isNonEmptyReadonlyArray(content) ? Option.some(html`<p><span>${content}</span></p>`) : Option.none(),
    ),
  Table: table =>
    Effect.map(BlockContentToHtml(table), content =>
      Option.some(
        html`<table>
          ${content}
        </table>`,
      ),
    ),
  TableRow: tableRow =>
    Effect.map(BlockContentToHtml(tableRow), content =>
      Option.some(
        html`<tr>
          ${content}
        </tr>`,
      ),
    ),
  TableCell: tableCell =>
    Effect.map(BlockContentToHtmlSkippingOverSingleParagraph(tableCell), content =>
      Option.some(html`<td><span>${content}</span></td>`),
    ),
  TableHeaderCell: tableHeaderCell =>
    Effect.map(BlockContentToHtmlSkippingOverSingleParagraph(tableHeaderCell), content =>
      Option.some(html`<th><span>${content}</span></th>`),
    ),
  UnorderedList: unorderedList =>
    Effect.map(BlockContentToHtml(unorderedList), content =>
      Option.some(
        html`<ul>
          ${content}
        </ul>`,
      ),
    ),
})

const BlockContentToHtml = (
  block: Types.ExcludeTag<Block, 'EmbeddedAssetBlock' | 'EmbeddedEntryBlock'>,
): Effect.Effect<ReadonlyArray<Html>, ParseResult.ParseError, DynamicEmbedder | Locale> =>
  Effect.forEach(
    block.content,
    (element: Block | Inline | Text) => {
      if (element._tag === 'Text') {
        return Effect.succeed(TextToHtml(element))
      }

      if (element._tag === 'EntryHyperlink' || element._tag === 'Hyperlink') {
        return Effect.succeed(InlineElementToHtml(element))
      }

      return BlockElementToHtml(element)
    },
    { concurrency: 'inherit' },
  ).pipe(Effect.andThen(Array.getSomes))

const BlockContentToHtmlSkippingOverSingleParagraph = (
  block: Types.ExcludeTag<Block, 'EmbeddedAssetBlock' | 'EmbeddedEntryBlock'>,
): Effect.Effect<ReadonlyArray<Html>, ParseResult.ParseError, DynamicEmbedder | Locale> => {
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
