import { UrlParams } from '@effect/platform'
import { Data, Effect, Option, Schema } from 'effect'
import { NonEmptyString } from '../../types/index.js'

export type IsMissingAnythingForm = EmptyForm | CompletedForm

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isMissingAnything: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { isMissingAnything } = yield* Schema.decode(IsMissingAnythingSchema)(body)

    return new CompletedForm({ isMissingAnything })
  },
  Effect.catchTag('ParseError', () => Effect.succeed(new CompletedForm({ isMissingAnything: Option.none() }))),
)

export const fromAnswer: (
  answer: Option.Option<Option.Option<NonEmptyString.NonEmptyString>>,
) => IsMissingAnythingForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ isMissingAnything: answer }),
})

const IsMissingAnythingSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isMissingAnything: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
