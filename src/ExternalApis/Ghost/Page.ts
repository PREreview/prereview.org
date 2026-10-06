import { Schema } from 'effect'
import { HtmlSchema } from '../../html.ts'

export class Page extends Schema.Class<Page>('Page')({
  html: HtmlSchema,
}) {}
