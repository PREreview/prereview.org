import { Effect, flow, Option, type ParseResult, pipe, Predicate, Record, Schema } from 'effect'
import { Locale } from '../../../Context.ts'
import { ContentfulId, type Entry } from '../../../ExternalApis/Contentful/index.ts'
import { html } from '../../../html.ts'
import { DefaultLocale, type SupportedLocale } from '../../../locales/index.ts'
import { SlugSchema } from '../../../types/Slug.ts'
import { MediaEntry } from '../ContentfulTypes.ts'
import { ContentfulBlogPostTitle } from '../Types.ts'

const BlogPostEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('blogPost')) }) }),
  }),
  fields: Schema.Struct({
    title: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
    slug: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: SlugSchema }),
    heroImage: Schema.optional(
      Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.encodedSchema(MediaEntry) }),
    ),
    excerpt: Schema.optional(Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString })),
  }),
})

const BlogPostEntryToContentfulBlogPostTitle = Effect.fnUntraced(function* (entry: typeof BlogPostEntry.Type) {
  const locale = yield* Locale

  return new ContentfulBlogPostTitle({
    title: Option.match(getValueForLocale(entry.fields.title, locale), {
      onSome: title => html`${title}`,
      onNone: () => html`${getValueForDefaultLocale(entry.fields.title)}`,
    }),
    locale: Option.match(getValueForLocale(entry.fields.title, locale), {
      onSome: () => locale,
      onNone: () => DefaultLocale,
    }),
    slug: getValueForDefaultLocale(entry.fields.slug),
    heroImage: yield* Effect.sync(() => {
      if (!entry.fields.heroImage) {
        return undefined
      }

      const heroImage = getValueForDefaultLocale(entry.fields.heroImage)
      const file = getValueForDefaultLocale(heroImage.fields.file)
      const asset = getValueForDefaultLocale(file.fields.file)

      return {
        url: asset.url,
        width: asset.details.image.width,
        height: asset.details.image.height,
      }
    }),
    excerpt:
      typeof entry.fields.excerpt !== 'undefined'
        ? Option.getOrElse(getValueForLocale(entry.fields.excerpt, locale), () =>
            getValueForDefaultLocale(entry.fields.excerpt!),
          )
        : undefined,
  })
})

export const EntryToContentfulBlogPostTitle: (
  entry: Entry,
) => Effect.Effect<ContentfulBlogPostTitle, ParseResult.ParseError, Locale> = flow(
  Schema.decodeUnknown(Schema.typeSchema(BlogPostEntry)),
  Effect.andThen(BlogPostEntryToContentfulBlogPostTitle),
)

const getValueForLocale = <T>(values: Record<string, T | undefined>, locale: SupportedLocale): Option.Option<T> =>
  pipe(Record.get(values, locale), Option.filter(Predicate.isNotUndefined))

const getValueForDefaultLocale = <T>(values: Record<string, T | undefined>): T =>
  pipe(
    Record.get(values, DefaultLocale),
    Option.filter(Predicate.isNotUndefined),
    Option.getOrThrowWith(() => 'No locale available for a value'),
  )
