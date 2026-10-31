import type { UrlParams } from 'effect/http'
import { Data, Effect, Option, Schema } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type IsMissingAnythingForm = EmptyForm | CompletedForm

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isMissingAnything: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { isMissingAnything } = yield* Schema.decodeEffect(IsMissingAnythingSchema)(body)

    return new CompletedForm({ isMissingAnything })
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new CompletedForm({ isMissingAnything: Option.none() }))),
)

export const fromAnswer: (
  answer: Option.Option<Option.Option<NonEmptyString.NonEmptyString>>,
) => IsMissingAnythingForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ isMissingAnything: answer }),
})

const IsMissingAnythingSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isMissingAnything: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
