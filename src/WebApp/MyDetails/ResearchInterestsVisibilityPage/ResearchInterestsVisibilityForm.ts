import type { UrlParams } from 'effect/http'
import { Effect, Schema } from 'effect'

export interface ResearchInterestsVisibilityForm {
  researchInterestsVisibility: 'public' | 'restricted'
}

export const fromBody = (body: UrlParams.UrlParams): Effect.Effect<ResearchInterestsVisibilityForm> =>
  Effect.catchTag(Schema.decodeEffect(ResearchInterestsVisibilityFormSchema)(body), 'SchemaError', () =>
    Effect.succeed({ researchInterestsVisibility: 'restricted' as const }),
  )

const ResearchInterestsVisibilityFormSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      researchInterestsVisibility: Schema.Literals(['public', 'restricted']),
    }),
  ),
)
