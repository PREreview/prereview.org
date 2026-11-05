import type { UrlParams } from 'effect/http'
import { Effect, Schema } from 'effect'

export interface OpenForRequestsVisibilityForm {
  openForRequestsVisibility: 'public' | 'restricted'
}

export const fromBody = (body: UrlParams.UrlParams): Effect.Effect<OpenForRequestsVisibilityForm> =>
  Effect.catchTag(Schema.decodeEffect(OpenForRequestsVisibilityFormSchema)(body), 'SchemaError', () =>
    Effect.succeed({ openForRequestsVisibility: 'restricted' as const }),
  )

const OpenForRequestsVisibilityFormSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      openForRequestsVisibility: Schema.Literals(['public', 'restricted']),
    }),
  ),
)
