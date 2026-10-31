import { Schema } from 'effect'
import { SanitizeHtmlSchema } from '../html.ts'
import { SupportedLocales } from '../locales/index.ts'
import { NameSchema } from '../types/Name.ts'
import { SlugSchema } from '../types/Slug.ts'
import { InstantSchema } from '../types/Temporal.ts'

const RequiredJsSchema = Schema.HashSet(Schema.Literal('youtube-embed.js'))

const InlineHtmlSchema = SanitizeHtmlSchema({ allowBlockLevel: false, trusted: true })

const BlockHtmlSchema = SanitizeHtmlSchema({ trusted: true })

class Author extends Schema.Class<Author>('Author')({
  name: NameSchema,
}) {}

export class BlogPost extends Schema.Class<BlogPost>('BlogPost')({
  authors: Schema.NonEmptyArray(Author),
  title: InlineHtmlSchema,
  channel: Schema.Literals(['blog', 'newsletter', 'weeknote']),
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
  js: RequiredJsSchema,
}) {}

export class BlogPostTitle extends Schema.Class<BlogPostTitle>('BlogPostTitle')({
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

export class PageOfBlogPosts extends Schema.Class<PageOfBlogPosts>('PageOfBlogPosts')({
  currentPage: Schema.Number.check(Schema.isGreaterThan(0)),
  totalPages: Schema.Number.check(Schema.isGreaterThan(0)),
  blogPosts: Schema.NonEmptyArray(BlogPostTitle),
}) {}

export class Page extends Schema.Class<Page>('Page')({
  title: InlineHtmlSchema,
  html: BlockHtmlSchema,
  locale: Schema.Literals([...SupportedLocales]),
  js: RequiredJsSchema,
}) {}

export type PageId =
  | 'AboutUs'
  | 'ChampionsProgram'
  | 'Clubs'
  | 'CodeOfConduct'
  | 'EdiaStatement'
  | 'Funding'
  | 'HowToUse'
  | 'LiveReviews'
  | 'People'
  | 'PrivacyPolicy'
  | 'Resources'
  | 'Trainings'
