import { Data, Effect, Either, Schema } from 'effect'
import { EmailAddress, NonEmptyString } from '../../../types/index.ts'

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

export const fromBody = (body: unknown) =>
  Effect.gen(function* () {
    const base = yield* Effect.mapError(
      Schema.decodeUnknown(EmailAddressBaseFieldSchema)(body),
      () => new InvalidForm({ emailAddress: Either.left(new Missing()) }),
    )

    const { emailAddress } = yield* Effect.mapError(
      Schema.decodeUnknown(EmailAddressFieldSchema)(body),
      () => new InvalidForm({ emailAddress: Either.left(new Invalid({ value: base.emailAddress })) }),
    )

    return new CompletedForm({ emailAddress })
  }).pipe(Effect.merge)

const EmailAddressBaseFieldSchema = Schema.Struct({
  emailAddress: NonEmptyString.NonEmptyStringSchema,
})

const EmailAddressFieldSchema = Schema.Struct({
  emailAddress: EmailAddress.EmailAddressSchema,
})
