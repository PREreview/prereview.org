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
  from: Schema.Struct({
    name: Schema.compose(Schema.Trim, Schema.NonEmptyString),
    address: EmailAddress.EmailAddressSchema,
  }),
  to: Schema.Struct({
    name: Schema.compose(Schema.Trim, Schema.NonEmptyString),
    address: EmailAddress.EmailAddressSchema,
  }),
  subject: Schema.compose(Schema.Trim, Schema.NonEmptyString),
  text: Schema.compose(Schema.Trim, Schema.NonEmptyString),
  html: HtmlSchema,
}) {}
