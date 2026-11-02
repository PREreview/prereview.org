import { describe, expect, it } from './vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as _ from '../src/AuthorInviteStore.ts'
import * as fc from './fc.ts'

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
  it.effect.prop('when there is an author invite', [fc.uuid(), fc.authorInvite()], ([id, authorInvite]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(id, JSON.stringify(authorInvite))

      const actual = yield* _.get(id)

      expect(actual).toStrictEqual(authorInvite)
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is something other than an author invite', [fc.uuid(), fc.json()], ([id, value]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(id, JSON.stringify(value))

      const actual = yield* Effect.result(_.get(id))

      expect(actual).toStrictEqual(Result.fail('not-found'))
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is no author invite', [fc.uuid()], ([id]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.get(id))

      expect(actual).toStrictEqual(Result.fail('not-found'))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.uuid()], ([id]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.get(id))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('save', () => {
  it.effect.prop('stores the author invite', [fc.uuid(), fc.authorInvite()], ([id, authorInvite]) =>
    Effect.gen(function* () {
      yield* _.save(id, authorInvite)

      const actual = yield* _.get(id)

      expect(actual).toStrictEqual(authorInvite)
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.uuid(), fc.authorInvite()], ([id, authorInvite]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.save(id, authorInvite))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})
