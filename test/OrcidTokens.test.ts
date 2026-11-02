import { describe, expect, it } from './vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as _ from '../src/OrcidTokens.ts'
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
  it.effect.prop('when there is an ORCID token', [fc.orcidId(), fc.orcidToken()], ([orcid, orcidToken]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify({ ...orcidToken, scopes: [...orcidToken.scopes] }))

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(orcidToken)
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is something other than an ORCID token', [fc.orcidId(), fc.json()], ([orcid, value]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify(value))

      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail('not-found'))
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is no orcidToken', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail('not-found'))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('getAll', () => {
  it.effect.prop(
    'returns all ORCID tokens',
    [fc.uniqueArray(fc.tuple(fc.orcidId(), fc.orcidToken()), { selector: ([orcid]) => orcid })],
    ([orcidTokens]) =>
      Effect.gen(function* () {
        yield* Effect.forEach(orcidTokens, ([orcid, orcidToken]) => _.save(orcid, orcidToken))

        const actual = yield* _.getAll()

        expect(actual).toStrictEqual(Object.fromEntries(orcidTokens))
      }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect('when the store is unavailable', () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.getAll())

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('save', () => {
  it.effect.prop('stores the orcidToken', [fc.orcidId(), fc.orcidToken()], ([orcid, orcidToken]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, orcidToken)

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(orcidToken)
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId(), fc.orcidToken()], ([orcid, orcidToken]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.save(orcid, orcidToken))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('remove', () => {
  it.effect.prop('removes the orcidToken', [fc.orcidId(), fc.orcidToken()], ([orcid, orcidToken]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, orcidToken)

      yield* _.remove(orcid)

      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail('not-found'))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when there is no orcidToken', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* _.remove(orcid)

      expect(actual).toBeUndefined()
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.remove(orcid))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})
