import { Context, Effect, Layer, Option, pipe, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as RedisKeyValueStore from '../RedisKeyValueStore.ts'
import type { OrcidId } from '../types/index.ts'
import type { IsOpenForRequests } from './legacy-is-open-for-requests.ts'

const IsOpenForRequestsSchema = Schema.Union([
  Schema.Struct({ value: Schema.Literal(false) }),
  Schema.Struct({ value: Schema.Literal(true), visibility: Schema.Literals(['public', 'restricted']) }),
]) satisfies Schema.Codec<IsOpenForRequests, unknown>

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof IsOpenForRequestsSchema>>()(
  'Prereviewers/IsOpenForRequestsStore/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, IsOpenForRequestsSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('is-open-for-requests')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, KeyValueStore.layerMemory)

export const get = Effect.fn('IsOpenForRequestsStore.get')(function* (orcid: OrcidId.OrcidId) {
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

export const save = Effect.fn('IsOpenForRequestsStore.save')(function* (
  orcid: OrcidId.OrcidId,
  isOpenForRequests: IsOpenForRequests,
) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, isOpenForRequests),
    Effect.catchTags({
      SchemaError: () => Effect.fail('unavailable' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access is-open-for-requests'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail('unavailable' as const)),
  )
