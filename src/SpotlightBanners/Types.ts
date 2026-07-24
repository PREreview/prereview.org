import { Schema } from 'effect'
import { Html, PlainText, plainText, sanitizeHtml } from '../html.ts'

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: string => sanitizeHtml(string, { allowBlockLevel: false, trusted: true }),
  encode: String,
})

const PlainTextSchema: Schema.Schema<PlainText, string> = Schema.transform(
  Schema.String,
  Schema.instanceOf(PlainText),
  {
    strict: true,
    decode: plainText,
    encode: String,
  },
)

export class SpotlightBanner extends Schema.Class<SpotlightBanner>('SpotlightBanner')({
  id: Schema.NonEmptyString,
  title: PlainTextSchema,
  description: HtmlSchema,
  callToAction: Schema.Struct({
    text: PlainTextSchema,
    url: Schema.URL,
  }),
}) {}
