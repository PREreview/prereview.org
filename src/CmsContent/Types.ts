import { Schema } from 'effect'
import { SanitizeHtmlSchema } from '../html.ts'
import { SupportedLocales } from '../locales/index.ts'
import { NameSchema } from '../types/Name.ts'
import { SlugSchema } from '../types/Slug.ts'
import { InstantSchema } from '../types/Temporal.ts'

const RequiredJsSchema = Schema.HashSetFromSelf(Schema.Literal('youtube-embed.js'))

const InlineHtmlSchema = SanitizeHtmlSchema({ allowBlockLevel: false, trusted: true })

const BlockHtmlSchema = SanitizeHtmlSchema({ trusted: true })

class Author extends Schema.Class<Author>('Author')({
  name: NameSchema,
}) {}

export class BlogPost extends Schema.Class<BlogPost>('BlogPost')({
  authors: Schema.NonEmptyArray(Author),
  title: InlineHtmlSchema,
  channel: Schema.Literal('blog', 'newsletter', 'weeknote'),
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
  js: RequiredJsSchema,
}) {}

export class BlogPostTitle extends Schema.Class<BlogPostTitle>('BlogPostTitle')({
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

export class PageOfBlogPosts extends Schema.Class<PageOfBlogPosts>('PageOfBlogPosts')({
  currentPage: Schema.Positive,
  totalPages: Schema.Positive,
  blogPosts: Schema.NonEmptyArray(BlogPostTitle),
}) {}

export class Page extends Schema.Class<Page>('Page')({
  title: InlineHtmlSchema,
  html: BlockHtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
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
