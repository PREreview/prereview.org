import { Effect, flow, Layer, Option, type ParseResult, pipe, Predicate, Record, Schema } from 'effect'
import { Locale } from '../../../Context.ts'
import { ContentfulId, type Entry } from '../../../ExternalApis/Contentful/index.ts'
import { html } from '../../../html.ts'
import { DefaultLocale } from '../../../locales/index.ts'
import { SlugSchema } from '../../../types/Slug.ts'
import { InstantSchema } from '../../../types/Temporal.ts'
import { HeroImageEntry } from '../ContentfulTypes.ts'
import * as ImageUrl from '../ImageUrl.ts'
import { ContentfulBlogPostTitle } from '../Types.ts'

export const BlogPostEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('blogPost')) }) }),
    createdAt: InstantSchema,
  }),
  fields: Schema.Struct({
    title: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
    slug: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: SlugSchema }),
    heroImage: Schema.optional(
      Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.encodedSchema(HeroImageEntry) }),
    ),
    excerpt: Schema.optional(Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyString })),
    firstPublishedAtOverride: Schema.optional(
      Schema.Record({ key: Schema.NonEmptyTrimmedString, value: InstantSchema }),
    ),
  }),
})

const BlogPostEntryToContentfulBlogPostTitle = Effect.fnUntraced(function* (entry: typeof BlogPostEntry.Type) {
  return new ContentfulBlogPostTitle({
    title: html`${getValueForDefaultLocale(entry.fields.title)}`,
    locale: DefaultLocale,
    slug: getValueForDefaultLocale(entry.fields.slug),
    heroImage: yield* Effect.sync(() => {
      if (!entry.fields.heroImage) {
        return undefined
      }

      const heroImage = getValueForDefaultLocale(entry.fields.heroImage)
      const image = getValueForDefaultLocale(heroImage.fields.image)
      const asset = getValueForDefaultLocale(image.fields.file)

      const width = Math.min(asset.details.image.width, 600)

      return {
        url: {
          avif: ImageUrl.avif(asset, 600),
          webp: ImageUrl.webp(asset, 600),
          default: ImageUrl.fallback(asset, 600),
        },
        width,
        height: Math.round((asset.details.image.height * width) / asset.details.image.width),
      }
    }),
    excerpt:
      typeof entry.fields.excerpt !== 'undefined' ? getValueForDefaultLocale(entry.fields.excerpt).trim() : undefined,
    publishedAt: entry.fields.firstPublishedAtOverride
      ? getValueForDefaultLocale(entry.fields.firstPublishedAtOverride)
      : entry.sys.createdAt,
  })
})

export const EntryToContentfulBlogPostTitle: (
  entry: Entry,
) => Effect.Effect<ContentfulBlogPostTitle, ParseResult.ParseError> = flow(
  Schema.decodeUnknown(Schema.typeSchema(BlogPostEntry)),
  Effect.andThen(BlogPostEntryToContentfulBlogPostTitle),
  Effect.provide(Layer.succeed(Locale, DefaultLocale)),
)

const getValueForDefaultLocale = <T>(values: Record<string, T | undefined>): T =>
  pipe(
    Record.get(values, DefaultLocale),
    Option.filter(Predicate.isNotUndefined),
    Option.getOrThrowWith(() => 'No locale available for a value'),
  )
