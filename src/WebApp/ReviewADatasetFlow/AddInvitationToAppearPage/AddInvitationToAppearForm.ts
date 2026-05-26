import { UrlParams } from '@effect/platform'
import { Data, Either, identity, pipe, Schema, String, Struct } from 'effect'
import { EmailAddress, NonEmptyString } from '../../../types/index.ts'

export type AddInvitationToAppearForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class Invalid extends Data.TaggedError('Invalid')<{ actual: NonEmptyString.NonEmptyString }> {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  name: Either.Either<NonEmptyString.NonEmptyString, Missing>
  emailAddress: Either.Either<EmailAddress.EmailAddress, Missing | Invalid>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  name: NonEmptyString.NonEmptyString
  emailAddress: EmailAddress.EmailAddress
}> {}

export const fromBody = (body: UrlParams.UrlParams) => {
  const name = pipe(
    Schema.decodeEither(NameFieldSchema)(body),
    Either.mapBoth({
      onRight: Struct.get('name'),
      onLeft: () => new Missing(),
    }),
  )
  const emailAddress = pipe(
    Schema.decodeEither(EmailAddressFieldSchema)(body),
    Either.mapBoth({
      onRight: Struct.get('emailAddress'),
      onLeft: () => new Missing(),
    }),
    Either.filterOrLeft(
      value => EmailAddress.isEmailAddress(value),
      value => new Invalid({ actual: value }),
    ),
  )

  return Either.match(Either.all({ name, emailAddress }), {
    onRight: fields => new CompletedForm(fields),
    onLeft: () => new InvalidForm({ name, emailAddress }),
  })
}

const CollapsedWhitespaceSchema = Schema.transform(Schema.String, Schema.Trim, {
  strict: true,
  decode: String.replaceAll(/\s+/g, ' '),
  encode: identity,
})

const NameFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    name: Schema.compose(CollapsedWhitespaceSchema, NonEmptyString.NonEmptyStringSchema),
  }),
)

const EmailAddressFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    emailAddress: Schema.compose(CollapsedWhitespaceSchema, NonEmptyString.NonEmptyStringSchema),
  }),
)
