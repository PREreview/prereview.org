import { Data, Schema } from 'effect'
import { HtmlSchema } from '../../html.ts'
import { EmailAddress } from '../../types/index.ts'

export class UnableToSendEmail extends Data.TaggedError('UnableToSendEmail')<{ cause?: unknown }> {}

export const Email = Schema.Struct({
  from: Schema.Struct({
    name: Schema.compose(Schema.Trim, Schema.NonEmptyString),
    address: EmailAddress.EmailAddressSchema,
  }),
  to: Schema.Union(
    Schema.Struct({
      name: Schema.compose(Schema.Trim, Schema.NonEmptyString),
      address: EmailAddress.EmailAddressSchema,
    }),
    EmailAddress.EmailAddressSchema,
  ),
  subject: Schema.compose(Schema.Trim, Schema.NonEmptyString),
  text: Schema.compose(Schema.Trim, Schema.NonEmptyString),
  html: HtmlSchema,
})

export type Email = typeof Email.Type
