import { Effect, Layer, pipe, UndefinedOr } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { type LegacySessionStore, SessionStore } from './Context.ts'
import * as RedisKeyValueStore from './RedisKeyValueStore.ts'

export const fromKeyValueStore = Effect.fnUntraced(function* (store: KeyValueStore.KeyValueStore) {
  const runPromise = Effect.runPromiseWith(yield* Effect.context())

  return {
    get: key => runPromise(pipe(store.get(key), Effect.map(UndefinedOr.map(value => JSON.parse(value) as unknown)))),
    set: (key, value) => runPromise(store.set(key, JSON.stringify(value))),
    delete: key => runPromise(store.remove(key)),
  } satisfies LegacySessionStore
})

export const layerKeyValueStore = Layer.effect(
  SessionStore,
  Effect.gen(function* () {
    return { cookie: 'session', store: yield* fromKeyValueStore(yield* KeyValueStore.KeyValueStore) }
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('sessions', { timeToLive: '30 days' })),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))
