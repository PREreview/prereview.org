import {
  Array,
  Context,
  Effect,
  flow,
  HashSet,
  Match,
  Option,
  pipe,
  Predicate,
  Record,
  Ref,
  Schema,
  Struct,
  type Types,
  Filter,
} from 'effect'
import { format } from 'fp-ts-routing'
import slugify from 'slugify'
import { Locale } from '../../Context.ts'
import * as Datasets from '../../Datasets/index.ts'
import {
  Asset,
  type Block,
  type Heading1,
  type Heading2,
  type Heading3,
  type ImageAsset,
  type Contentful,
  type Inline,
  LinkedAsset,
  LinkedEntry,
  type Mark,
  type Text,
  type VideoAsset,
} from '../../ExternalApis/Contentful/index.ts'
import { type Html, html, rawHtml } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { DefaultLocale, type SupportedLocale, translate } from '../../locales/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import * as Routes from '../../routes.ts'
import { reviewMatch } from '../../routes.ts'
import { renderDate } from '../../time.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { Slug } from '../../types/Slug.ts'
import { getSubfieldName } from '../../types/subfield.ts'
import {
  CallToActionEntry,
  DynamicEmbedEntry,
  FlourishEntry,
  MediaEntry,
  MediaGalleryEntry,
  PageEntry,
  ReviewListEntry,
  YouTubeEntry,
} from './ContentfulTypes.ts'
import { DynamicEmbedder } from './DynamicEmbedder.ts'
import * as FlourishVisualizationId from './FlourishVisualizationId.ts'
import * as ImageUrl from './ImageUrl.ts'
import * as YouTubeVideoId from './YouTubeVideoId.ts'

const EmbeddedEntry = LinkedEntry(
  Schema.Union([
    CallToActionEntry,
    DynamicEmbedEntry,
    FlourishEntry,
    MediaEntry,
    MediaGalleryEntry,
    ReviewListEntry,
    YouTubeEntry,
  ]),
)

const EmbeddedAsset = LinkedAsset(Schema.toType(Asset))

const HyperlinkTarget = LinkedEntry(PageEntry)

export class RequiredJs extends Context.Service<
  RequiredJs,
  Ref.Ref<HashSet.HashSet<'flourish-embed.js' | 'youtube-embed.js'>>
>()('RequiredJs') {}

const EmbeddedEntryToHtml = Match.typeTags<
  typeof EmbeddedEntry.Type,
  Effect.Effect<
    Html,
    | Schema.SchemaError
    | Prereviews.PrereviewIsNotFound
    | Prereviews.PrereviewIsUnavailable
    | Prereviews.PrereviewWasRemoved,
    Contentful | DynamicEmbedder | Locale | Prereviews.Prereviews | RequiredJs
  >
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
  MediaGalleryEntry: Effect.fnUntraced(function* (mediaGallery) {
    const items = getValueForDefaultLocale(mediaGallery.fields.items)

    const itemsHtml = yield* Effect.forEach(
      items,
      Effect.fnUntraced(function* (media) {
        const asset = getValueForDefaultLocale(media.fields.file)
        const altText = media.fields.altText ? getValueForDefaultLocale(media.fields.altText) : ''
        const caption = yield* media.fields.caption
          ? BlockContentToHtml(getValueForDefaultLocale(media.fields.caption))
          : Effect.succeedNone

        return html`
          <figure>
            ${AssetToHtml({ asset, altText })}
            ${Option.match(caption, { onSome: caption => html`<figcaption>${caption}</figcaption>`, onNone: () => '' })}
          </figure>
        `
      }),
      { concurrency: 'unbounded' },
    )

    return html`<div class="media-gallery">${itemsHtml}</div>`
  }),
  ReviewListEntry: Effect.fnUntraced(function* (reviewList) {
    const locale = yield* Locale

    const prereviews = yield* Effect.forEach(
      getValueForDefaultLocale(reviewList.fields.reviews),
      id => Prereviews.getPrereviewSummary(id),
      { concurrency: 'unbounded' },
    )

    return html`
      <ol class="cards">
        ${prereviews.map(
          Match.valueTags({
            RecentPreprintPrereview: prereview => html`
              <li>
                <article>
                  <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                    ${
                      prereview.club
                        ? translate(
                            locale,
                            'reviews-list',
                            'clubReviewText',
                          )({
                            club: html`<b ${languageAttributesFor(prereview.club.language)}>${prereview.club.name}</b>`,
                            numberOfReviewers: prereview.reviewers.named.length + prereview.reviewers.anonymous,
                            reviewers: pipe(
                              prereview.reviewers.named,
                              Array.appendAll(
                                prereview.reviewers.anonymous > 0
                                  ? [
                                      translate(
                                        locale,
                                        'reviews-list',
                                        'otherAuthors',
                                      )({ number: prereview.reviewers.anonymous }),
                                    ]
                                  : [],
                              ),
                              Array.map(name => html`<b dir="auto">${name}</b>`),
                              formatList(locale),
                            ),
                            preprint: html`<cite ${languageAttributesFor(prereview.preprint.language)}
                              >${prereview.preprint.title}</cite
                            >`,
                          })
                        : translate(
                            locale,
                            'reviews-list',
                            'reviewText',
                          )({
                            numberOfReviewers: prereview.reviewers.named.length + prereview.reviewers.anonymous,
                            reviewers: pipe(
                              prereview.reviewers.named,
                              Array.appendAll(
                                prereview.reviewers.anonymous > 0
                                  ? [
                                      translate(
                                        locale,
                                        'reviews-list',
                                        'otherAuthors',
                                      )({ number: prereview.reviewers.anonymous }),
                                    ]
                                  : [],
                              ),
                              Array.map(name => html`<b dir="auto">${name}</b>`),
                              formatList(locale),
                            ),
                            preprint: html`<cite ${languageAttributesFor(prereview.preprint.language)}
                              >${prereview.preprint.title}</cite
                            >`,
                          })
                    }
                  </a>

                  ${
                    prereview.subfields.length > 0
                      ? html`
                          <ul class="categories">
                            ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`)}
                          </ul>
                        `
                      : ''
                  }

                  <dl>
                    <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
                    <dd>${Preprints.getServerName(prereview.preprint.id)}</dd>
                  </dl>
                </article>
              </li>
            `,
            RecentDatasetPrereview: prereview => html`
              <li>
                <article>
                  <a href="${Routes.DatasetReview.href({ datasetReviewId: prereview.id })}">
                    ${
                      prereview.club
                        ? translate(
                            locale,
                            'dataset-reviews-list',
                            'reviewTextInClub',
                          )({
                            club: html`<b ${languageAttributesFor(prereview.club.language)}>${prereview.club.name}</b>`,
                            numberOfReviewers: 1 + prereview.otherAuthors.length + prereview.anonymousAuthors,
                            reviewer: authorList(prereview, locale),
                            dataset: html`<cite ${languageAttributesFor(prereview.dataset.language)}
                              >${prereview.dataset.title}</cite
                            >`,
                          })
                        : translate(
                            locale,
                            'dataset-reviews-list',
                            'reviewText',
                          )({
                            numberOfReviewers: 1 + prereview.otherAuthors.length + prereview.anonymousAuthors,
                            reviewer: authorList(prereview, locale),
                            dataset: html`<cite ${languageAttributesFor(prereview.dataset.language)}
                              >${prereview.dataset.title}</cite
                            >`,
                          })
                    }
                  </a>

                  <dl>
                    <dt>${translate(locale, 'dataset-reviews-list', 'reviewPublished')()}</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>${translate(locale, 'dataset-reviews-list', 'repository')()}</dt>
                    <dd>${Datasets.getRepositoryName(prereview.dataset.id)}</dd>
                  </dl>
                </article>
              </li>
            `,
          }),
        )}
      </ol>
    `
  }),
  FlourishEntry: Effect.fnUntraced(function* (flourish) {
    const url = getValueForDefaultLocale(flourish.fields.url)
    const title = getValueForDefaultLocale(flourish.fields.title)
    const caption = yield* flourish.fields.caption
      ? BlockContentToHtml(getValueForDefaultLocale(flourish.fields.caption))
      : Effect.succeedNone

    if (Option.isNone(caption)) {
      return yield* FlourishLink({ url, title })
    }

    const captionId = `flourish-caption-${flourish.sys.id}`

    return html`
      <figure>
        ${yield* FlourishLink({ url, title, describedBy: captionId })}
        <figcaption id="${captionId}">${caption.value}</figcaption>
      </figure>
    `
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

const authorList = (datasetReview: Prereviews.RecentDatasetPrereview, locale: SupportedLocale) => {
  const list: Array.NonEmptyArray<Html | NonEmptyString> = Array.map(
    Array.make(datasetReview.author, ...datasetReview.otherAuthors),
    displayPersona,
  )

  if (datasetReview.anonymousAuthors > 0) {
    list.push(translate(locale, 'dataset-reviews-list', 'otherAuthors')({ number: datasetReview.anonymousAuthors }))
  }

  return formatList(locale)(Array.map(list, name => html`<b dir="auto">${name}</b>`))
}

const displayPersona = Prereviewers.matchPersona({
  onPublic: Struct.get('displayName'),
  onPseudonym: Struct.get('pseudonym'),
})

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

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

  yield* Ref.update(requiredJs, set => HashSet.add(set, 'youtube-embed.js'))

  return html`
    <youtube-embed data-video-id="${videoId.value}" data-title="${title}">
      <a href="${url.href}" class="youtube-video" ${describedByAttribute}>
        <img src="${YouTubeVideoId.thumbnailUrl(videoId.value).href}" width="480" height="360" alt="" loading="lazy" />
        <span ${languageAttributesFor('en')}>Watch <cite class="visually-hidden">${title}</cite> on YouTube</span>
      </a>
    </youtube-embed>
  `
})

const FlourishLink = Effect.fnUntraced(function* ({
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
  const visualizationId = FlourishVisualizationId.fromUrl(url)

  if (Option.isNone(visualizationId)) {
    return html`<a href="${url.href}" ${describedByAttribute}>
      <span ${languageAttributesFor('en')}>View <cite>${title}</cite> on Flourish</span></a
    > `
  }

  yield* Ref.update(requiredJs, set => HashSet.add(set, 'flourish-embed.js'))

  return html`
    <flourish-embed data-visualization-id="${visualizationId.value}" data-title="${title}">
      <a href="${url.href}" class="flourish-visualization" ${describedByAttribute}>
        <img
          src="${FlourishVisualizationId.thumbnailUrl(visualizationId.value).href}"
          width="1020"
          alt=""
          loading="lazy"
        />
        <span ${languageAttributesFor('en')}>View <cite class="visually-hidden">${title}</cite> on Flourish</span>
      </a>
    </flourish-embed>
  `
})

const AssetToHtml = ({ asset, altText }: { asset: Asset; altText: string }) =>
  Match.valueTags(asset, {
    ImageAsset: asset => ImageAssetToHtml({ asset, altText }),
    VideoAsset: asset => VideoAssetToHtml({ asset, altText }),
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
        loading="lazy"
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
        loading="lazy"
      />
    </picture>
  `
}

const VideoAssetToHtml = ({ asset, altText }: { asset: VideoAsset; altText: string }) => {
  const file = getValueForDefaultLocale(asset.fields.file)

  return html`
    <video controls loading="lazy" preload="metadata">
      <source src="${file.url.href}" type="${file.contentType}" />
      ${altText ? html`<span>${altText}</span>` : ''}
    </video>
  `
}

const BlockElementToHtml = Match.typeTags<
  Block,
  Effect.Effect<
    Option.Option<Html>,
    | Schema.SchemaError
    | Prereviews.PrereviewIsNotFound
    | Prereviews.PrereviewIsUnavailable
    | Prereviews.PrereviewWasRemoved,
    Contentful | DynamicEmbedder | Locale | Prereviews.Prereviews | RequiredJs
  >
>()({
  BlockQuote: blockQuote =>
    Effect.map(
      BlockContentToHtml(blockQuote),
      Option.map(content => html`<blockquote>${content}</blockquote>`),
    ),
  Document: document => BlockContentToHtml(document),
  EmbeddedAssetBlock: embeddedAssetBlock =>
    pipe(
      Schema.decodeUnknownEffect(EmbeddedAsset)(embeddedAssetBlock.data.target),
      Effect.map(asset => Option.some(AssetToHtml({ asset, altText: '' }))),
    ),
  EmbeddedEntryBlock: embeddedEntryBlock =>
    pipe(
      Schema.decodeUnknownEffect(EmbeddedEntry)(embeddedEntryBlock.data.target),
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
): Effect.Effect<
  Option.Option<Html>,
  | Schema.SchemaError
  | Prereviews.PrereviewIsNotFound
  | Prereviews.PrereviewIsUnavailable
  | Prereviews.PrereviewWasRemoved,
  Contentful | DynamicEmbedder | Locale | Prereviews.Prereviews | RequiredJs
> =>
  Effect.forEach(
    block.content,
    (element: Block | Inline | Text) => {
      if (element._tag === 'Text') {
        return Effect.succeed(TextToHtml(element))
      }

      if (element._tag === 'EntryHyperlink' || element._tag === 'Hyperlink') {
        return InlineElementToHtml(element)
      }

      return BlockElementToHtml(element)
    },
    { concurrency: 'unbounded' },
  ).pipe(
    Effect.map(Array.getSomes),
    Effect.map(content => Option.some(html`${content}`)),
    Effect.map(Option.filter(content => content.toString().trim() !== '')),
  )

const BlockContentToHtmlSkippingOverSingleParagraph = (
  block: Types.ExcludeTag<Block, 'EmbeddedAssetBlock' | 'EmbeddedEntryBlock' | 'HorizontalRule'>,
): Effect.Effect<
  Option.Option<Html>,
  | Schema.SchemaError
  | Prereviews.PrereviewIsNotFound
  | Prereviews.PrereviewIsUnavailable
  | Prereviews.PrereviewWasRemoved,
  Contentful | DynamicEmbedder | Locale | Prereviews.Prereviews | RequiredJs
> => {
  if (block.content.length === 1 && block.content[0]._tag === 'Paragraph') {
    return BlockContentToHtml(block.content[0])
  }

  return BlockContentToHtml(block)
}

const InlineElementToHtml = Match.typeTags<
  Inline,
  Effect.Effect<Option.Option<Html>, Schema.SchemaError, Contentful>
>()({
  EntryHyperlink: hyperlink =>
    Effect.map(Schema.decodeUnknownEffect(HyperlinkTarget)(hyperlink.data.target), target =>
      Option.some(
        html`<a href="/${getValueForDefaultLocale(target.fields.slug)}">${InlineContentToHtml(hyperlink)}</a>`,
      ),
    ),
  Hyperlink: hyperlink =>
    Effect.succeedSome(
      html`<a href="${hyperlink.data.uri.replace(/^https?:\/\/prereview\.org(?:\/|$)/, '/')}"
        >${InlineContentToHtml(hyperlink)}</a
      >`,
    ),
})

const InlineContentToHtml = (inline: Inline): ReadonlyArray<Html> =>
  Array.filterMap(inline.content, Filter.fromPredicateOption(TextToHtml))

const TextToHtml = (text: Text): Option.Option<Html> =>
  text.value === ''
    ? Option.none()
    : Option.some(Array.reduce(text.marks, html`${text.value.replaceAll(/\s+/g, ' ')}`, MarkToHtml))

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
