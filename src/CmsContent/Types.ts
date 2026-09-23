import { Schema } from 'effect'
import { Html, sanitizeHtml } from '../html.ts'
import { SupportedLocales } from '../locales/index.ts'
import { NameSchema } from '../types/Name.ts'
import { SlugSchema } from '../types/Slug.ts'
import { InstantSchema } from '../types/Temporal.ts'

const InlineHtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: string => sanitizeHtml(string, { allowBlockLevel: false, trusted: true }),
  encode: String,
})

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: string => sanitizeHtml(string, { trusted: true }),
  encode: String,
})

class Author extends Schema.Class<Author>('Author')({
  name: NameSchema,
}) {}

export class BlogPost extends Schema.Class<BlogPost>('BlogPost')({
  authors: Schema.NonEmptyArray(Author),
  title: InlineHtmlSchema,
  heroImage: Schema.optional(
    Schema.Struct({
      url: Schema.URLFromSelf,
      width: Schema.NonNegativeInt,
      height: Schema.NonNegativeInt,
    }),
  ),
  html: HtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
  publishedAt: InstantSchema,
}) {}

export class BlogPostTitle extends Schema.Class<BlogPostTitle>('BlogPostTitle')({
  title: InlineHtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
  slug: SlugSchema,
}) {}

export class PageOfBlogPosts extends Schema.Class<PageOfBlogPosts>('PageOfBlogPosts')({
  currentPage: Schema.Positive,
  totalPages: Schema.Positive,
  blogPosts: Schema.NonEmptyArray(BlogPostTitle),
}) {}

export class Page extends Schema.Class<Page>('Page')({
  title: InlineHtmlSchema,
  html: HtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
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
