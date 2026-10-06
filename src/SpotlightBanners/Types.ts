import { Schema } from 'effect'
import { SanitizeHtmlSchema } from '../html.ts'

const HtmlSchema = SanitizeHtmlSchema({ allowBlockLevel: false, trusted: true })

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
