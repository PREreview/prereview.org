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
  channel: Schema.Literals(['blog', 'newsletter', 'weeknote']),
  title: InlineHtmlSchema,
  heroImage: Schema.optional(
    Schema.Struct({
      url: Schema.Struct({
        avif: Schema.URL,
        webp: Schema.URL,
        default: Schema.URL,
      }),
      width: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
      height: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
      altText: Schema.optional(Schema.Trimmed.check(Schema.isNonEmpty())),
      caption: Schema.optional(BlockHtmlSchema),
    }),
  ),
  excerpt: Schema.optional(Schema.Trimmed.check(Schema.isNonEmpty())),
  html: BlockHtmlSchema,
  locale: Schema.Literals([...SupportedLocales]),
  publishedAt: InstantSchema,
  js: Schema.HashSet(Schema.Literal('youtube-embed.js')),
}) {}

export class ContentfulBlogPostTitle extends Schema.Class<ContentfulBlogPostTitle>('ContentfulBlogPostTitle')({
  title: InlineHtmlSchema,
  locale: Schema.Literals([...SupportedLocales]),
  slug: SlugSchema,
  heroImage: Schema.optional(
    Schema.Struct({
      url: Schema.Struct({
        avif: Schema.URL,
        webp: Schema.URL,
        default: Schema.URL,
      }),
      width: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
      height: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    }),
  ),
  excerpt: Schema.optional(Schema.Trimmed.check(Schema.isNonEmpty())),
  publishedAt: InstantSchema,
}) {}

export class ContentfulPageOfBlogPosts extends Schema.Class<ContentfulPageOfBlogPosts>('ContentfulPageOfBlogPosts')({
  currentPage: Schema.Number.check(Schema.isGreaterThan(0)),
  totalPages: Schema.Number.check(Schema.isGreaterThan(0)),
  blogPosts: Schema.NonEmptyArray(ContentfulBlogPostTitle),
}) {}

export class ContentfulPage extends Schema.Class<ContentfulPage>('ContentfulPage')({
  title: InlineHtmlSchema,
  html: BlockHtmlSchema,
  locale: Schema.Literals([...SupportedLocales]),
  js: Schema.HashSet(Schema.Literal('youtube-embed.js')),
}) {}
