import { Array, Effect, flow, Layer, Option, type ParseResult, pipe, Predicate, Record, Schema } from 'effect'
import { Locale } from '../../../Context.ts'
import { ContentfulId, Document, type Entry } from '../../../ExternalApis/Contentful/index.ts'
import { html } from '../../../html.ts'
import { DefaultLocale, type SupportedLocale } from '../../../locales/index.ts'
import { NameSchema } from '../../../types/Name.ts'
import { InstantSchema } from '../../../types/Temporal.ts'
import { HeroImageEntry } from '../ContentfulTypes.ts'
import { DynamicEmbedder } from '../DynamicEmbedder.ts'
import { BlockContentToHtml } from '../RichText.ts'
import { Author, ContentfulBlogPost } from '../Types.ts'

const AuthorEntry = Schema.Struct({
  fields: Schema.Struct({ name: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: NameSchema }) }),
})

const BlogPostEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('blogPost')) }) }),
    createdAt: InstantSchema,
  }),
  fields: Schema.Struct({
    authors: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyArray(AuthorEntry) }),
    title: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
    heroImage: Schema.optional(
      Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.encodedSchema(HeroImageEntry) }),
    ),
    content: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.typeSchema(Document) }),
    firstPublishedAtOverride: Schema.optional(
      Schema.Record({ key: Schema.NonEmptyTrimmedString, value: InstantSchema }),
    ),
  }),
})

const BlogPostEntryToContentfulBlogPost = Effect.fnUntraced(function* (entry: typeof BlogPostEntry.Type) {
  const locale = yield* Locale

  return new ContentfulBlogPost({
    authors: Array.map(
      getValueForDefaultLocale(entry.fields.authors),
      author => new Author({ name: getValueForDefaultLocale(author.fields.name) }),
    ),
    title: Option.match(getValueForLocale(entry.fields.title, locale), {
      onSome: title => html`${title}`,
      onNone: () => html`${getValueForDefaultLocale(entry.fields.title)}`,
    }),
    heroImage: yield* Effect.gen(function* () {
      if (!entry.fields.heroImage) {
        return undefined
      }

      const heroImage = getValueForDefaultLocale(entry.fields.heroImage)
      const image = getValueForDefaultLocale(heroImage.fields.image)
      const asset = getValueForDefaultLocale(image.fields.file)
      const altText = heroImage.fields.altText ? getValueForDefaultLocale(heroImage.fields.altText) : undefined
      const caption = yield* heroImage.fields.caption
        ? BlockContentToHtml(getValueForDefaultLocale(heroImage.fields.caption))
        : Effect.succeed([])

      return {
        url: asset.url,
        width: asset.details.image.width,
        height: asset.details.image.height,
        altText,
        caption: Array.match(caption, { onNonEmpty: () => html`${caption}`, onEmpty: () => undefined }),
      }
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
    publishedAt: entry.fields.firstPublishedAtOverride
      ? getValueForDefaultLocale(entry.fields.firstPublishedAtOverride)
      : entry.sys.createdAt,
  })
})

export const EntryToContentfulBlogPost: (
  entry: Entry,
) => Effect.Effect<ContentfulBlogPost, ParseResult.ParseError, Locale> = flow(
  Schema.decodeUnknown(Schema.typeSchema(BlogPostEntry)),
  Effect.andThen(BlogPostEntryToContentfulBlogPost),
  Effect.provide(Layer.mock(DynamicEmbedder, {})),
)

const getValueForLocale = <T>(values: Record<string, T | undefined>, locale: SupportedLocale): Option.Option<T> =>
  pipe(Record.get(values, locale), Option.filter(Predicate.isNotUndefined))

const getValueForDefaultLocale = <T>(values: Record<string, T | undefined>): T =>
  pipe(
    Record.get(values, DefaultLocale),
    Option.filter(Predicate.isNotUndefined),
    Option.getOrThrowWith(() => 'No locale available for a value'),
  )
