import type { UrlParams } from 'effect/http'
import { Effect, Schema } from 'effect'

export interface CareerStageVisibilityForm {
  careerStageVisibility: 'public' | 'restricted'
}

export const fromBody = (body: UrlParams.UrlParams): Effect.Effect<CareerStageVisibilityForm> =>
  Effect.catchTag(Schema.decodeEffect(CareerStageVisibilityFormSchema)(body), 'SchemaError', () =>
    Effect.succeed({ careerStageVisibility: 'restricted' as const }),
  )

const CareerStageVisibilityFormSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      careerStageVisibility: Schema.Literals(['public', 'restricted']),
    }),
  ),
)
