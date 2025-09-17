import { Schema } from 'effect'
import { Html, rawHtml } from '../../html.js'

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: rawHtml,
  encode: String,
})

export class Page extends Schema.Class<Page>('Page')({
  html: HtmlSchema,
}) {}
