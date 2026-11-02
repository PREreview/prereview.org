import { Context, Effect, Layer, Option, pipe } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as RedisKeyValueStore from '../RedisKeyValueStore.ts'
import { NonEmptyString, type OrcidId } from '../types/index.ts'

const AvatarIdSchema = NonEmptyString.NonEmptyStringSchema

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof AvatarIdSchema>>()(
  'Prereviewers/Avatars/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, AvatarIdSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('avatar-store')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))

export const get = Effect.fn('Avatars.get')(function* (orcid: OrcidId.OrcidId) {
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

export const save = Effect.fn('Avatars.save')(function* (
  orcid: OrcidId.OrcidId,
  avatarId: NonEmptyString.NonEmptyString,
) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, avatarId),
    Effect.catchTags({
      SchemaError: () => Effect.fail('unavailable' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const remove = Effect.fn('Avatars.remove')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(store.remove(orcid), Effect.asVoid, Effect.catchTag('KeyValueStoreError', unavailable))
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access avatars'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail('unavailable' as const)),
  )
