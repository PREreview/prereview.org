import { Schema } from 'effect'
import { Html, sanitizeHtml } from '../../html.ts'
import { SupportedLocales } from '../../locales/index.ts'
import { NameSchema } from '../../types/Name.ts'
import { InstantSchema } from '../../types/Temporal.ts'

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

export class Author extends Schema.Class<Author>('Author')({
  name: NameSchema,
}) {}

export class ContentfulBlogPost extends Schema.Class<ContentfulBlogPost>('ContentfulBlogPost')({
  authors: Schema.NonEmptyArray(Author),
  title: InlineHtmlSchema,
  html: HtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
  publishedAt: InstantSchema,
}) {}

export class ContentfulPage extends Schema.Class<ContentfulPage>('ContentfulPage')({
  title: InlineHtmlSchema,
  html: HtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
}) {}
