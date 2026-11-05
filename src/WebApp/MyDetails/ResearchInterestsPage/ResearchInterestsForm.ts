import type { UrlParams } from 'effect/http'
import { Data, Effect, Schema } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type ResearchInterestsForm = EmptyForm | CompletedForm

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  researchInterests: NonEmptyString.NonEmptyString
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { researchInterests } = yield* Schema.decodeEffect(ResearchInterestsFieldSchema)(body)

    return new CompletedForm({ researchInterests })
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new EmptyForm())),
)

const ResearchInterestsFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      researchInterests: NonEmptyString.NonEmptyStringSchema,
    }),
  ),
)
