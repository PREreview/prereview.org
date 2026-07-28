import { Schema } from 'effect'
import { Html, sanitizeHtml } from '../../html.ts'
import { SupportedLocales } from '../../locales/index.ts'

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: string => sanitizeHtml(string, { trusted: true }),
  encode: String,
})

export class ContentfulPage extends Schema.Class<ContentfulPage>('ContentfulPage')({
  html: HtmlSchema,
  locale: Schema.Literal(...SupportedLocales),
}) {}
