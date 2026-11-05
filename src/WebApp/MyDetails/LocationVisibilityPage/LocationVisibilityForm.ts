import type { UrlParams } from 'effect/http'
import { Effect, Schema } from 'effect'

export interface LocationVisibilityForm {
  locationVisibility: 'public' | 'restricted'
}

export const fromBody = (body: UrlParams.UrlParams): Effect.Effect<LocationVisibilityForm> =>
  Effect.catchTag(Schema.decodeEffect(LocationVisibilityFormSchema)(body), 'SchemaError', () =>
    Effect.succeed({ locationVisibility: 'restricted' as const }),
  )

const LocationVisibilityFormSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      locationVisibility: Schema.Literals(['public', 'restricted']),
    }),
  ),
)
