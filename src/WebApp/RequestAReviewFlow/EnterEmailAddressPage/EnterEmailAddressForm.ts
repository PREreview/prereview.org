import { UrlParams } from '@effect/platform'
import { Data, Either, identity, Match, pipe, Schema, String, Struct } from 'effect'
import type { ContactAddress } from '../../../ReviewRequests/index.ts'
import { EmailAddress } from '../../../types/index.ts'
import { NonEmptyStringSchema } from '../../../types/NonEmptyString.ts'

export type EnterEmailAddressForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class Invalid extends Data.TaggedError('Invalid')<{ value: string }> {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  emailAddress: Either.Either<never, Missing | Invalid>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  emailAddress: EmailAddress.EmailAddress
}> {}

export const fromContactAddress = Match.typeTags<ContactAddress, EnterEmailAddressForm>()({
  VerifiedContactAddress: contactAddress => new CompletedForm({ emailAddress: contactAddress.value }),
  UnverifiedContactAddress: contactAddress => new CompletedForm({ emailAddress: contactAddress.value }),
  NoContactAddress: () => new EmptyForm(),
})

export const fromBody = (body: UrlParams.UrlParams): EnterEmailAddressForm => {
  const emailAddress = pipe(
    Schema.decodeEither(EmailAddressFieldSchema)(body),
    Either.mapBoth({
      onRight: Struct.get('emailAddress'),
      onLeft: () => new Missing(),
    }),
    Either.filterOrLeft(
      value => EmailAddress.isEmailAddress(value),
      value => new Invalid({ value }),
    ),
  )

  return Either.match(emailAddress, {
    onRight: emailAddress => new CompletedForm({ emailAddress }),
    onLeft: emailAddress => new InvalidForm({ emailAddress: Either.left(emailAddress) }),
  })
}

const CollapsedWhitespaceSchema = Schema.transform(Schema.String, Schema.Trim, {
  strict: true,
  decode: String.replaceAll(/\s+/g, ' '),
  encode: identity,
})

const EmailAddressFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    emailAddress: Schema.compose(CollapsedWhitespaceSchema, NonEmptyStringSchema),
  }),
)
