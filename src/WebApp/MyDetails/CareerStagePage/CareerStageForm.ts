import type { UrlParams } from 'effect/http'
import { Data, Effect, Schema } from 'effect'

export type CareerStageForm = InvalidForm | CompletedForm

export class InvalidForm extends Data.TaggedClass('InvalidForm') {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  careerStage: 'early' | 'mid' | 'late' | 'skip'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { careerStage } = yield* Schema.decodeEffect(CareerStageFieldSchema)(body)

    return new CompletedForm({ careerStage })
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new InvalidForm())),
)

const CareerStageFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      careerStage: Schema.Literals(['early', 'mid', 'late', 'skip']),
    }),
  ),
)
