import type { UrlParams } from 'effect/http'
import { Data, Effect, Schema } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type LanguagesForm = EmptyForm | CompletedForm

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  languages: NonEmptyString.NonEmptyString
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { languages } = yield* Schema.decodeEffect(LanguagesFieldSchema)(body)

    return new CompletedForm({ languages })
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new EmptyForm())),
)

const LanguagesFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      languages: NonEmptyString.NonEmptyStringSchema,
    }),
  ),
)
