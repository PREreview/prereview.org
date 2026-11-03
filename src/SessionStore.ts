import { Effect, Layer, pipe, UndefinedOr } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { SessionStore, type SessionStorage } from './Context.ts'
import * as RedisKeyValueStore from './RedisKeyValueStore.ts'

export const fromKeyValueStore = (store: KeyValueStore.KeyValueStore): SessionStorage => ({
  get: key =>
    Effect.flatMap(
      store.get(key),
      UndefinedOr.match({
        onUndefined: () => Effect.succeedNone,
        onDefined: value =>
          Effect.asSome(
            Effect.try({
              try: () => JSON.parse(value) as unknown,
              catch: cause =>
                new KeyValueStore.KeyValueStoreError({ message: 'Unable to parse', method: 'get', key, cause }),
            }),
          ),
      }),
    ),
  set: (key, value) =>
    pipe(
      Effect.try({
        try: () => JSON.stringify(value),
        catch: cause =>
          new KeyValueStore.KeyValueStoreError({ message: 'Unable to encode', method: 'set', key, cause }),
      }),
      Effect.flatMap(json => store.set(key, json)),
    ),
  delete: key => Effect.asVoid(store.remove(key)),
})

export const layerKeyValueStore = Layer.effect(
  SessionStore,
  Effect.gen(function* () {
    return { cookie: 'session', store: fromKeyValueStore(yield* KeyValueStore.KeyValueStore) }
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('sessions', { timeToLive: '30 days' })),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))
