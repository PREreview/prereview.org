import type { UrlParams } from 'effect/http'
import { Data, Result, identity, pipe, Schema, String, Struct, SchemaTransformation, flow } from 'effect'
import { EmailAddress, Name, NonEmptyString } from '../../../types/index.ts'

export type AddInvitationToAppearForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class Invalid extends Data.TaggedError('Invalid')<{ actual: NonEmptyString.NonEmptyString }> {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  name: Result.Result<Name.Name, Missing>
  emailAddress: Result.Result<EmailAddress.EmailAddress, Missing | Invalid>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  name: Name.Name
  emailAddress: EmailAddress.EmailAddress
}> {}

export const fromBody = (body: UrlParams.UrlParams) => {
  const name = pipe(
    Schema.decodeResult(NameFieldSchema)(body),
    Result.mapBoth({
      onSuccess: Struct.get('name'),
      onFailure: () => new Missing(),
    }),
  )
  const emailAddress = pipe(
    Schema.decodeResult(EmailAddressFieldSchema)(body),
    Result.mapBoth({
      onSuccess: Struct.get('emailAddress'),
      onFailure: () => new Missing(),
    }),
    Result.filterOrFail(
      value => EmailAddress.isEmailAddress(value),
      value => new Invalid({ actual: value }),
    ),
  )

  return Result.match(Result.all({ name, emailAddress }), {
    onSuccess: fields => new CompletedForm(fields),
    onFailure: () => new InvalidForm({ name, emailAddress }),
  })
}

const CollapsedWhitespaceSchema = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({ decode: flow(String.replaceAll(/\s+/g, ' '), String.trim), encode: identity }),
  ),
)

const NameFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      name: Name.NameSchema,
    }),
  ),
)

const EmailAddressFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      emailAddress: CollapsedWhitespaceSchema.pipe(Schema.decodeTo(NonEmptyString.NonEmptyStringSchema)),
    }),
  ),
)
