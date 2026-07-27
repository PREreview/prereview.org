import { Schema } from 'effect'
import { Html, sanitizeHtml } from '../html.ts'

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: string => sanitizeHtml(string, { allowBlockLevel: false, trusted: true }),
  encode: String,
})

export class SpotlightBanner extends Schema.Class<SpotlightBanner>('SpotlightBanner')({
  id: Schema.NonEmptyString,
  title: HtmlSchema,
  description: HtmlSchema,
  callToAction: Schema.Struct({
    text: HtmlSchema,
    url: Schema.URL,
  }),
  theme: Schema.Literal('community', 'product'),
}) {}
