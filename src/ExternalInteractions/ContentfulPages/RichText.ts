import {
  Array,
  Context,
  Effect,
  HashSet,
  Match,
  Option,
  type ParseResult,
  pipe,
  Predicate,
  Record,
  Ref,
  Schema,
  type Types,
} from 'effect'
import slugify from 'slugify'
import { Locale } from '../../Context.ts'
import type {
  Asset,
  Block,
  Heading1,
  Heading2,
  Heading3,
  ImageAsset,
  Inline,
  Mark,
  Text,
} from '../../ExternalApis/Contentful/index.ts'
import { type Html, html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { DefaultLocale, type SupportedLocale } from '../../locales/index.ts'
import { Slug } from '../../types/Slug.ts'
import { CallToActionEntry, DynamicEmbedEntry, MediaEntry, PageEntry, YouTubeEntry } from './ContentfulTypes.ts'
import { DynamicEmbedder } from './DynamicEmbedder.ts'
import * as ImageUrl from './ImageUrl.ts'
import * as YouTubeVideoId from './YouTubeVideoId.ts'

const EmbeddedEntry = Schema.Union(CallToActionEntry, DynamicEmbedEntry, MediaEntry, YouTubeEntry)

export class RequiredJs extends Context.Tag('RequiredJs')<RequiredJs, Ref.Ref<HashSet.HashSet<'youtube-embed.js'>>>() {}

const EmbeddedEntryToHtml = Match.typeTags<
  typeof EmbeddedEntry.Type,
  Effect.Effect<Html, ParseResult.ParseError, DynamicEmbedder | Locale | RequiredJs>
>()({
  CallToActionEntry: Effect.fnUntraced(function* (callToAction) {
    const locale = yield* Locale

    const text = Option.match(getValueForLocale(callToAction.fields.text, locale), {
      onSome: text => html`<span>${text}</span>`,
      onNone: () =>
        html`<span ${languageAttributesFor(DefaultLocale)}
          >${getValueForDefaultLocale(callToAction.fields.text)}</span
        >`,
    })

    return html`<a href="${getValueForDefaultLocale(callToAction.fields.url).href}" class="button">${text}</a>`
  }),
  DynamicEmbedEntry: Effect.fnUntraced(function* (dynamicEmbed) {
    const dynamicEmbedded = yield* DynamicEmbedder

    return yield* dynamicEmbedded[getValueForDefaultLocale(dynamicEmbed.fields.key)]
  }),
  MediaEntry: Effect.fnUntraced(function* (media) {
    const asset = getValueForDefaultLocale(media.fields.file)
    const altText = media.fields.altText ? getValueForDefaultLocale(media.fields.altText) : ''
    const caption = yield* media.fields.caption
      ? BlockContentToHtml(getValueForDefaultLocale(media.fields.caption))
      : Effect.succeedNone

    return Option.match(caption, {
      onSome: caption => html`
        <figure>
          ${AssetToHtml({ asset, altText })}
          <figcaption>${caption}</figcaption>
        </figure>
      `,
      onNone: () => AssetToHtml({ asset, altText }),
    })
  }),
  YouTubeEntry: Effect.fnUntraced(function* (youTube) {
    const url = getValueForDefaultLocale(youTube.fields.url)
    const title = getValueForDefaultLocale(youTube.fields.title)
    const caption = yield* youTube.fields.caption
      ? BlockContentToHtml(getValueForDefaultLocale(youTube.fields.caption))
      : Effect.succeedNone

    if (Option.isNone(caption)) {
      return yield* YouTubeLink({ url, title })
    }

    const captionId = `youtube-caption-${youTube.sys.id}`

    return html`
      <figure>
        ${yield* YouTubeLink({ url, title, describedBy: captionId })}
        <figcaption id="${captionId}">${caption.value}</figcaption>
      </figure>
    `
  }),
})

const YouTubeLink = Effect.fnUntraced(function* ({
  url,
  title,
  describedBy,
}: {
  url: URL
  title: string
  describedBy?: string
}): Effect.fn.Return<Html, never, RequiredJs> {
  const requiredJs = yield* RequiredJs

  const describedByAttribute = describedBy === undefined ? '' : html`aria-describedby="${describedBy}"`
  const videoId = YouTubeVideoId.fromUrl(url)

  if (Option.isNone(videoId)) {
    return html`<a href="${url.href}" ${describedByAttribute}>
      <span ${languageAttributesFor('en')}>Watch <cite>${title}</cite> on YouTube</span></a
    > `
  }

  yield* Ref.update(requiredJs, HashSet.add('youtube-embed.js'))

  return html`
    <youtube-embed data-video-id="${videoId.value}" data-title="${title}">
      <a href="${url.href}" class="youtube-video" ${describedByAttribute}>
        <img src="${YouTubeVideoId.thumbnailUrl(videoId.value).href}" width="480" height="360" alt="" />
        <span ${languageAttributesFor('en')}>Watch <cite class="visually-hidden">${title}</cite> on YouTube</span>
      </a>
    </youtube-embed>
  `
})

const AssetToHtml = ({ asset, altText }: { asset: Asset; altText: string }) =>
  Match.valueTags(asset, {
    ImageAsset: asset => ImageAssetToHtml({ asset, altText }),
    VideoAsset: () => {
      throw new Error('not implemented')
    },
  })

const ImageAssetToHtml = ({ asset, altText }: { asset: ImageAsset; altText: string }) => {
  const file = getValueForDefaultLocale(asset.fields.file)

  if (file.contentType === 'image/svg+xml') {
    return html`
      <img
        src="${file.url.href}"
        width="${file.details.image.width}"
        height="${file.details.image.height}"
        alt="${altText}"
      />
    `
  }

  return html`
    <picture>
      <source srcset="${ImageUrl.avif(file).href}" type="image/avif" />
      <source srcset="${ImageUrl.webp(file).href}" type="image/webp" />
      <img
        src="${ImageUrl.fallback(file).href}"
        width="${file.details.image.width}"
        height="${file.details.image.height}"
        alt="${altText}"
      />
    </picture>
  `
}

const BlockElementToHtml = Match.typeTags<
  Block,
  Effect.Effect<Option.Option<Html>, ParseResult.ParseError, DynamicEmbedder | Locale | RequiredJs>
>()({
  BlockQuote: blockQuote =>
    Effect.map(
      BlockContentToHtml(blockQuote),
      Option.map(content => html`<blockquote>${content}</blockquote>`),
    ),
  Document: document => BlockContentToHtml(document),
  EmbeddedAssetBlock: embeddedAssetBlock =>
    Effect.succeedSome(AssetToHtml({ asset: embeddedAssetBlock.data.target, altText: '' })),
  EmbeddedEntryBlock: embeddedEntryBlock =>
    pipe(
      Schema.decodeUnknown(EmbeddedEntry)(embeddedEntryBlock.data.target),
      Effect.andThen(EmbeddedEntryToHtml),
      Effect.asSome,
    ),
  Heading1: heading1 =>
    Effect.map(
      BlockContentToHtml(heading1),
      Option.map(content => html`<h1 id="${SlugFromHeading(heading1)}"><span>${content}</span></h1>`),
    ),
  Heading2: heading2 =>
    Effect.map(
      BlockContentToHtml(heading2),
      Option.map(content => html`<h2 id="${SlugFromHeading(heading2)}"><span>${content}</span></h2> `),
    ),
  Heading3: heading3 =>
    Effect.map(
      BlockContentToHtml(heading3),
      Option.map(content => html`<h3 id="${SlugFromHeading(heading3)}"><span>${content}</span></h3>`),
    ),
  HorizontalRule: () => Effect.succeedSome(html`<hr />`),
  ListItem: listItem =>
    Effect.map(
      BlockContentToHtmlSkippingOverSingleParagraph(listItem),
      Option.map(content => html`<li><span>${content}</span></li>`),
    ),
  OrderedList: orderedList =>
    Effect.map(
      BlockContentToHtml(orderedList),
      Option.map(
        content =>
          html`<ol>
            ${content}
          </ol>`,
      ),
    ),
  Paragraph: paragraph =>
    Effect.map(
      BlockContentToHtml(paragraph),
      Option.map(content => html`<p><span>${content}</span></p>`),
    ),
  Table: table =>
    Effect.map(
      BlockContentToHtml(table),
      Option.map(
        content =>
          html`<table>
            ${content}
          </table>`,
      ),
    ),
  TableRow: tableRow =>
    Effect.map(
      BlockContentToHtml(tableRow),
      Option.map(
        content =>
          html`<tr>
            ${content}
          </tr>`,
      ),
    ),
  TableCell: tableCell =>
    Effect.map(
      BlockContentToHtmlSkippingOverSingleParagraph(tableCell),
      Option.map(content => html`<td><span>${content}</span></td>`),
    ),
  TableHeaderCell: tableHeaderCell =>
    Effect.map(
      BlockContentToHtmlSkippingOverSingleParagraph(tableHeaderCell),
      Option.map(content => html`<th><span>${content}</span></th>`),
    ),
  UnorderedList: unorderedList =>
    Effect.map(
      BlockContentToHtml(unorderedList),
      Option.map(
        content =>
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
): Effect.Effect<Option.Option<Html>, ParseResult.ParseError, DynamicEmbedder | Locale | RequiredJs> =>
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
  ).pipe(
    Effect.andThen(Array.getSomes),
    Effect.map(content => Option.some(html`${content}`)),
    Effect.map(Option.filter(content => content.toString().trim() !== '')),
  )

const BlockContentToHtmlSkippingOverSingleParagraph = (
  block: Types.ExcludeTag<Block, 'EmbeddedAssetBlock' | 'EmbeddedEntryBlock' | 'HorizontalRule'>,
): Effect.Effect<Option.Option<Html>, ParseResult.ParseError, DynamicEmbedder | Locale | RequiredJs> => {
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
