import { Schema } from 'effect'
import { SanitizeHtmlSchema } from '../../html.ts'
import { SupportedLocales } from '../../locales/index.ts'
import { NameSchema } from '../../types/Name.ts'
import { SlugSchema } from '../../types/Slug.ts'
import { InstantSchema } from '../../types/Temporal.ts'

const InlineHtmlSchema = SanitizeHtmlSchema({ allowBlockLevel: false, trusted: true })

const BlockHtmlSchema = SanitizeHtmlSchema({ trusted: true })

export class Author extends Schema.Class<Author>('Author')({
  name: NameSchema,
}) {}

export class ContentfulBlogPost extends Schema.Class<ContentfulBlogPost>('ContentfulBlogPost')({
  authors: Schema.NonEmptyArray(Author),
  title: InlineHtmlSchema,
  heroImage: Schema.optional(
    Schema.Struct({
      url: Schema.Struct({
        avif: Schema.URLFromSelf,
        webp: Schema.URLFromSelf,
        default: Schema.URLFromSelf,
      }),
      width: Schema.NonNegativeInt,
      height: Schema.NonNegativeInt,
      altText: Schema.optional(Schema.NonEmptyTrimmedString),
      caption: Schema.optional(BlockHtmlSchema),
    }),
  ),
  excerpt: Schema.optional(Schema.NonEmptyTrimmedString),
  html: BlockHtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
  publishedAt: InstantSchema,
}) {}

export class ContentfulBlogPostTitle extends Schema.Class<ContentfulBlogPostTitle>('ContentfulBlogPostTitle')({
  title: InlineHtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
  slug: SlugSchema,
  heroImage: Schema.optional(
    Schema.Struct({
      url: Schema.Struct({
        avif: Schema.URLFromSelf,
        webp: Schema.URLFromSelf,
        default: Schema.URLFromSelf,
      }),
      width: Schema.NonNegativeInt,
      height: Schema.NonNegativeInt,
    }),
  ),
  excerpt: Schema.optional(Schema.NonEmptyTrimmedString),
}) {}

export class ContentfulPageOfBlogPosts extends Schema.Class<ContentfulPageOfBlogPosts>('ContentfulPageOfBlogPosts')({
  currentPage: Schema.Positive,
  totalPages: Schema.Positive,
  blogPosts: Schema.NonEmptyArray(ContentfulBlogPostTitle),
}) {}

export class ContentfulPage extends Schema.Class<ContentfulPage>('ContentfulPage')({
  title: InlineHtmlSchema,
  html: BlockHtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
}) {}
