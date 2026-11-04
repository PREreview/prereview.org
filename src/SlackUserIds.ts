import { Context, Effect, Layer, Option, pipe, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Slack } from './ExternalApis/index.ts'
import * as RedisKeyValueStore from './RedisKeyValueStore.ts'
import type { SlackUserId } from './slack-user-id.ts'
import { NonEmptyString, type OrcidId } from './types/index.ts'

const SlackUserIdSchema = Schema.Struct({
  accessToken: Schema.RedactedFromValue(NonEmptyString.NonEmptyStringSchema),
  scopes: Schema.HashSet(NonEmptyString.NonEmptyStringSchema),
  userId: Slack.UserId.check(Schema.isNonEmpty()),
}) satisfies Schema.Codec<SlackUserId, unknown>

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof SlackUserIdSchema>>()(
  'SlackUserIds/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, SlackUserIdSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('slack-user-id')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))

export const get = Effect.fn('SlackUserIds.get')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(
    store.get(orcid),
    Effect.flatMap(Option.match({ onNone: () => Effect.fail('not-found' as const), onSome: Effect.succeed })),
    Effect.catchTags({
      SchemaError: () => Effect.fail('not-found' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const save = Effect.fn('SlackUserIds.save')(function* (orcid: OrcidId.OrcidId, slackUserId: SlackUserId) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, slackUserId),
    Effect.catchTags({
      SchemaError: () => Effect.fail('unavailable' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const remove = Effect.fn('SlackUserIds.remove')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(store.remove(orcid), Effect.asVoid, Effect.catchTag('KeyValueStoreError', unavailable))
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access Slack user IDs'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail('unavailable' as const)),
  )
