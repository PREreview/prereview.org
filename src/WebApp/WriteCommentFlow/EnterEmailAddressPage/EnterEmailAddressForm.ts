import { Data, Effect, Result, Schema } from 'effect'
import { EmailAddress, NonEmptyString } from '../../../types/index.ts'

export type EnterEmailAddressForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class Invalid extends Data.TaggedError('Invalid')<{ value: string }> {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  emailAddress: Result.Result<never, Missing | Invalid>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  emailAddress: EmailAddress.EmailAddress
}> {}

export const fromBody = (body: unknown) =>
  Effect.gen(function* () {
    const base = yield* Effect.mapError(
      Schema.decodeUnknownEffect(EmailAddressBaseFieldSchema)(body),
      () => new InvalidForm({ emailAddress: Result.fail(new Missing()) }),
    )

    const { emailAddress } = yield* Effect.mapError(
      Schema.decodeUnknownEffect(EmailAddressFieldSchema)(body),
      () => new InvalidForm({ emailAddress: Result.fail(new Invalid({ value: base.emailAddress })) }),
    )

    return new CompletedForm({ emailAddress })
  }).pipe(Effect.catch(Effect.succeed))

const EmailAddressBaseFieldSchema = Schema.Struct({
  emailAddress: NonEmptyString.NonEmptyStringSchema,
})

const EmailAddressFieldSchema = Schema.Struct({
  emailAddress: EmailAddress.EmailAddressSchema,
})
