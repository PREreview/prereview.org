import { Context, Effect, Layer, pipe, UndefinedOr } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as RedisKeyValueStore from '../../RedisKeyValueStore.ts'
import type { FormStorage } from './legacy-form.ts'

export class Store extends Context.Service<Store, FormStorage>()('PreprintReviews/FormStore/Store') {}

export const fromKeyValueStore = (store: KeyValueStore.KeyValueStore): FormStorage => ({
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
  Store,
  Effect.gen(function* () {
    return fromKeyValueStore(yield* KeyValueStore.KeyValueStore)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('forms')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))
