import type { UrlParams } from 'effect/http'
import { Data, Result, identity, Match, pipe, Schema, String, Struct, SchemaTransformation, flow } from 'effect'
import type { ContactAddress } from '../../../ReviewRequests/index.ts'
import { EmailAddress } from '../../../types/index.ts'
import { NonEmptyStringSchema } from '../../../types/NonEmptyString.ts'

export type EnterEmailAddressForm = EmptyForm | InvalidForm | CompletedForm

export type ValidForm = Exclude<EnterEmailAddressForm, InvalidForm>

export type SubmittedForm = Exclude<EnterEmailAddressForm, EmptyForm>

export class Missing extends Data.TaggedError('Missing') {}

export class Invalid extends Data.TaggedError('Invalid')<{ value: string }> {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  emailAddress: Result.Result<never, Missing | Invalid>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  emailAddress: EmailAddress.EmailAddress
}> {}

export const fromContactAddress = Match.typeTags<ContactAddress, ValidForm>()({
  VerifiedContactAddress: contactAddress => new CompletedForm({ emailAddress: contactAddress.value }),
  UnverifiedContactAddress: contactAddress => new CompletedForm({ emailAddress: contactAddress.value }),
  NoContactAddress: () => new EmptyForm(),
})

export const fromBody = (body: UrlParams.UrlParams): SubmittedForm => {
  const emailAddress = pipe(
    Schema.decodeResult(EmailAddressFieldSchema)(body),
    Result.mapBoth({
      onSuccess: Struct.get('emailAddress'),
      onFailure: () => new Missing(),
    }),
    Result.filterOrFail(
      value => EmailAddress.isEmailAddress(value),
      value => new Invalid({ value }),
    ),
  )

  return Result.match(emailAddress, {
    onSuccess: emailAddress => new CompletedForm({ emailAddress }),
    onFailure: emailAddress => new InvalidForm({ emailAddress: Result.fail(emailAddress) }),
  })
}

const CollapsedWhitespaceSchema = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({ decode: flow(String.replaceAll(/\s+/g, ' '), String.trim), encode: identity }),
  ),
)

const EmailAddressFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      emailAddress: CollapsedWhitespaceSchema.pipe(Schema.decodeTo(NonEmptyStringSchema)),
    }),
  ),
)
