import { Array, Effect, Match, Option, type ParseResult, pipe, Predicate, Record, Schema, type Types } from 'effect'
import slugify from 'slugify'
import { Locale } from '../../Context.ts'
import type { Block, Heading1, Heading2, Heading3, Inline, Mark, Text } from '../../ExternalApis/Contentful/index.ts'
import { type Html, html } from '../../html.ts'
import { DefaultLocale, type SupportedLocale } from '../../locales/index.ts'
import { Slug } from '../../types/Slug.ts'
import { CallToActionEntry, DynamicEmbedEntry, MediaEntry, PageEntry } from './ContentfulTypes.ts'
import { DynamicEmbedder } from './DynamicEmbedder.ts'

const EmbeddedEntry = Schema.Union(CallToActionEntry, DynamicEmbedEntry, MediaEntry)

const EmbeddedEntryToHtml = Match.typeTags<
  typeof EmbeddedEntry.Type,
  Effect.Effect<Html, ParseResult.ParseError, DynamicEmbedder | Locale>
>()({
  CallToActionEntry: Effect.fnUntraced(function* (callToAction) {
    const locale = yield* Locale

    const text = Option.getOrElse(getValueForLocale(callToAction.fields.text, locale), () =>
      getValueForDefaultLocale(callToAction.fields.text),
    )

    return html`<a href="${getValueForDefaultLocale(callToAction.fields.url).href}" class="button"
      ><span>${text}</span></a
    >`
  }),
  DynamicEmbedEntry: Effect.fnUntraced(function* (dynamicEmbed) {
    const dynamicEmbedded = yield* DynamicEmbedder

    return yield* dynamicEmbedded[getValueForDefaultLocale(dynamicEmbed.fields.key)]
  }),
  MediaEntry: Effect.fnUntraced(function* (media) {
    const file = getValueForDefaultLocale(media.fields.file)
    const asset = getValueForDefaultLocale(file.fields.file)
    const altText = media.fields.altText ? getValueForDefaultLocale(media.fields.altText) : ''
    const caption = yield* media.fields.caption
      ? BlockContentToHtml(getValueForDefaultLocale(media.fields.caption))
      : Effect.succeed([])

    return Array.match(caption, {
      onNonEmpty: caption => html`
        <figure>
          <img
            src="${asset.url.href}"
            width="${asset.details.image.width}"
            height="${asset.details.image.height}"
            alt="${altText}"
          />
          <figcaption>${caption}</figcaption>
        </figure>
      `,
      onEmpty: () => html`
        <img
          src="${asset.url.href}"
          width="${asset.details.image.width}"
          height="${asset.details.image.height}"
          alt="${altText}"
        />
      `,
    })
  }),
})

const BlockElementToHtml = Match.typeTags<
  Block,
  Effect.Effect<Option.Option<Html>, ParseResult.ParseError, DynamicEmbedder | Locale>
>()({
  BlockQuote: blockQuote =>
    Effect.map(BlockContentToHtml(blockQuote), content => Option.some(html`<blockquote>${content}</blockquote>`)),
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
    Effect.map(BlockContentToHtml(heading1), content =>
      Option.some(html`<h1 id="${SlugFromHeading(heading1)}"><span>${content}</span></h1>`),
    ),
  Heading2: heading2 =>
    Effect.map(BlockContentToHtml(heading2), content =>
      Option.some(html`<h2 id="${SlugFromHeading(heading2)}"><span>${content}</span></h2> `),
    ),
  Heading3: heading3 =>
    Effect.map(BlockContentToHtml(heading3), content =>
      Option.some(html`<h3 id="${SlugFromHeading(heading3)}"><span>${content}</span></h3>`),
    ),
  HorizontalRule: () => Effect.succeedSome(html`<hr />`),
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

const SlugFromHeading = (heading: Heading1 | Heading2 | Heading3): Slug => {
  const text = heading.content.map(element => element.value).join(' ')

  const slugified = slugify(text.replaceAll('/', ' '), { lower: true, strict: true })

  return Slug(slugified)
}

export const BlockContentToHtml = (
  block: Types.ExcludeTag<Block, 'EmbeddedAssetBlock' | 'EmbeddedEntryBlock' | 'HorizontalRule'>,
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
  block: Types.ExcludeTag<Block, 'EmbeddedAssetBlock' | 'EmbeddedEntryBlock' | 'HorizontalRule'>,
): Effect.Effect<ReadonlyArray<Html>, ParseResult.ParseError, DynamicEmbedder | Locale> => {
  if (block.content.length === 1 && block.content[0]._tag === 'Paragraph') {
    return BlockContentToHtml(block.content[0])
  }

  return BlockContentToHtml(block)
}

const InlineElementToHtml = Match.typeTags<Inline, Option.Option<Html>>()({
  EntryHyperlink: hyperlink => {
    const target = Schema.decodeUnknownSync(PageEntry)(hyperlink.data.target)

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
