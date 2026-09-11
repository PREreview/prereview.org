import { Schema } from 'effect'
import { Html, sanitizeHtml } from '../html.ts'
import { SupportedLocales } from '../locales/index.ts'

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
