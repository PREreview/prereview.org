import { Data, Schema, SchemaTransformation } from 'effect'
import { HtmlSchema } from '../../html.ts'
import { EmailAddress } from '../../types/index.ts'

export class UnableToSendEmail extends Data.TaggedError('UnableToSendEmail')<{ cause?: unknown }> {}

export const Email = Schema.Struct({
  from: Schema.Struct({
    name: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
    address: EmailAddress.EmailAddressSchema,
  }),
  to: Schema.Union([
    Schema.Struct({
      name: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
      address: EmailAddress.EmailAddressSchema,
    }),
    EmailAddress.EmailAddressSchema,
  ]),
  subject: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
  text: Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
  html: HtmlSchema,
})

export type Email = typeof Email.Type
