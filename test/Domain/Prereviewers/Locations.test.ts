import { describe, expect, it } from '../../vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as _ from '../../../src/Domain/Prereviewers/Locations.ts'
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
  it.effect.prop('when there is a location', [fc.orcidId(), fc.location()], ([orcid, location]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify(location))

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(location)
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is something other than a location', [fc.orcidId(), fc.json()], ([orcid, value]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify(value))

      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail(new _.LocationNotFound()))
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is no location', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail(new _.LocationNotFound()))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail(expect.any(_.LocationUnavailable)))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('getAll', () => {
  it.effect.prop(
    'returns all locations',
    [fc.uniqueArray(fc.tuple(fc.orcidId(), fc.location()), { selector: ([orcid]) => orcid })],
    ([locations]) =>
      Effect.gen(function* () {
        yield* Effect.forEach(locations, ([orcid, location]) => _.save(orcid, location))

        const actual = yield* _.getAll()

        expect(actual).toStrictEqual(Object.fromEntries(locations))
      }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect('when the store is unavailable', () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.getAll())

      expect(actual).toStrictEqual(Result.fail(expect.any(_.LocationUnavailable)))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('save', () => {
  it.effect.prop('stores the location', [fc.orcidId(), fc.location()], ([orcid, location]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, location)

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(location)
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId(), fc.location()], ([orcid, location]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.save(orcid, location))

      expect(actual).toStrictEqual(Result.fail(expect.any(_.LocationUnavailable)))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('remove', () => {
  it.effect.prop('removes the location', [fc.orcidId(), fc.location()], ([orcid, location]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, location)

      yield* _.remove(orcid)

      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail(new _.LocationNotFound()))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when there is no location', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* _.remove(orcid)

      expect(actual).toBeUndefined()
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.remove(orcid))

      expect(actual).toStrictEqual(Result.fail(expect.any(_.LocationUnavailable)))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})
