import { describe, expect, it } from '../../vitest.ts'
import { Effect, Layer, Option, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as _ from '../../../src/Domain/PreprintReviews/FormStore.ts'
import * as fc from '../../fc.ts'

const unavailableStore = Layer.succeed(
  KeyValueStore.KeyValueStore,
  KeyValueStore.makeStringOnly({
    get: () => Effect.fail(new KeyValueStore.KeyValueStoreError({ message: 'unavailable', method: 'get' })),
    set: () => Effect.fail(new KeyValueStore.KeyValueStoreError({ message: 'unavailable', method: 'set' })),
    remove: () => Effect.fail(new KeyValueStore.KeyValueStoreError({ message: 'unavailable', method: 'remove' })),
    clear: Effect.fail(new KeyValueStore.KeyValueStoreError({ message: 'unavailable', method: 'clear' })),
    size: Effect.fail(new KeyValueStore.KeyValueStoreError({ message: 'unavailable', method: 'size' })),
    keys: Effect.fail(new KeyValueStore.KeyValueStoreError({ message: 'unavailable', method: 'keys' })),
  }),
)

describe('get', () => {
  it.effect.prop('when there is a value', [fc.string(), fc.json()], ([key, value]) =>
    Effect.gen(function* () {
      const keyValueStore = yield* KeyValueStore.KeyValueStore
      yield* keyValueStore.set(key, JSON.stringify(value))
      const store = yield* _.Store

      const actual = yield* store.get(key)

      expect(actual).toStrictEqual(Option.some(JSON.parse(JSON.stringify(value))))
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is no value', [fc.string()], ([key]) =>
    Effect.gen(function* () {
      const store = yield* _.Store

      const actual = yield* store.get(key)

      expect(actual).toStrictEqual(Option.none())
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when the store is unavailable', [fc.string()], ([key]) =>
    Effect.gen(function* () {
      const store = yield* _.Store

      const actual = yield* Effect.result(store.get(key))

      expect(actual).toStrictEqual(Result.fail(expect.anything()))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('set', () => {
  it.effect.prop('stores the value', [fc.string(), fc.json()], ([key, value]) =>
    Effect.gen(function* () {
      const store = yield* _.Store
      yield* store.set(key, value)

      const keyValueStore = yield* KeyValueStore.KeyValueStore
      const actual = yield* keyValueStore.get(key)

      expect(actual).toStrictEqual(JSON.stringify(value))
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when the store is unavailable', [fc.string(), fc.json()], ([key, value]) =>
    Effect.gen(function* () {
      const store = yield* _.Store

      const actual = yield* Effect.result(store.set(key, value))

      expect(actual).toStrictEqual(Result.fail(expect.anything()))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('delete', () => {
  it.effect.prop('removes the value', [fc.string(), fc.json()], ([key, value]) =>
    Effect.gen(function* () {
      const store = yield* _.Store
      yield* store.set(key, value)

      yield* store.delete(key)

      const actual = yield* store.get(key)

      expect(actual).toStrictEqual(Option.none())
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when the store is unavailable', [fc.string()], ([key]) =>
    Effect.gen(function* () {
      const store = yield* _.Store

      const actual = yield* Effect.result(store.delete(key))

      expect(actual).toStrictEqual(Result.fail(expect.anything()))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})
