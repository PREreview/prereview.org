import { Data, Schema } from 'effect'
import { Html, rawHtml } from '../../html.ts'
import { EmailAddress } from '../../types/index.ts'

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: rawHtml,
  encode: String,
})

export class UnableToSendEmail extends Data.TaggedError('UnableToSendEmail')<{ cause?: unknown }> {}

export class Email extends Schema.Class<Email>('Email')({
  from: Schema.Struct({ name: Schema.NonEmptyTrimmedString, address: EmailAddress.EmailAddressSchema }),
  to: Schema.Struct({ name: Schema.NonEmptyTrimmedString, address: EmailAddress.EmailAddressSchema }),
  subject: Schema.NonEmptyTrimmedString,
  text: Schema.NonEmptyTrimmedString,
  html: HtmlSchema,
}) {}
