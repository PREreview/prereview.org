import { Context, Effect, Layer, pipe, UndefinedOr } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as RedisKeyValueStore from '../RedisKeyValueStore.ts'
import type { LegacyFormStore } from './legacy-form.ts'

export class Store extends Context.Service<Store, LegacyFormStore>()('PreprintReviews/FormStore/Store') {}

export const fromKeyValueStore = Effect.fnUntraced(function* (store: KeyValueStore.KeyValueStore) {
  const runPromise = Effect.runPromiseWith(yield* Effect.context())

  return Store.of({
    get: key => runPromise(pipe(store.get(key), Effect.map(UndefinedOr.map(value => JSON.parse(value) as unknown)))),
    set: (key, value) => runPromise(store.set(key, JSON.stringify(value))),
    delete: key => runPromise(store.remove(key)),
  })
})

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return yield* fromKeyValueStore(yield* KeyValueStore.KeyValueStore)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('forms')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))
