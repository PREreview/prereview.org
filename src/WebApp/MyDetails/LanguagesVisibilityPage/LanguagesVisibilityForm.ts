import type { UrlParams } from 'effect/http'
import { Effect, Schema } from 'effect'

export interface LanguagesVisibilityForm {
  languagesVisibility: 'public' | 'restricted'
}

export const fromBody = (body: UrlParams.UrlParams): Effect.Effect<LanguagesVisibilityForm> =>
  Effect.catchTag(Schema.decodeEffect(LanguagesVisibilityFormSchema)(body), 'SchemaError', () =>
    Effect.succeed({ languagesVisibility: 'restricted' as const }),
  )

const LanguagesVisibilityFormSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      languagesVisibility: Schema.Literals(['public', 'restricted']),
    }),
  ),
)
