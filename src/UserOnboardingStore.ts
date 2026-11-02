import { Context, Effect, Layer, Option, pipe, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as RedisKeyValueStore from './RedisKeyValueStore.ts'
import type { OrcidId } from './types/index.ts'
import type { UserOnboarding } from './user-onboarding.ts'

const UserOnboardingSchema = Schema.Struct({
  seenMyDetailsPage: Schema.Boolean,
}) satisfies Schema.Codec<UserOnboarding, unknown>

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof UserOnboardingSchema>>()(
  'UserOnboardingStore/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, UserOnboardingSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('user-onboarding')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))

export const get = Effect.fn('UserOnboardingStore.get')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(
    store.get(orcid),
    Effect.map(Option.getOrElse((): UserOnboarding => ({ seenMyDetailsPage: false }))),
    Effect.catchTags({
      SchemaError: () => Effect.succeed<UserOnboarding>({ seenMyDetailsPage: false }),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const save = Effect.fn('UserOnboardingStore.save')(function* (
  orcid: OrcidId.OrcidId,
  userOnboarding: UserOnboarding,
) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, userOnboarding),
    Effect.catchTags({
      SchemaError: () => Effect.fail('unavailable' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access user onboarding'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail('unavailable' as const)),
  )
