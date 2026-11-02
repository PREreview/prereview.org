import { describe, expect, it } from '../vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as _ from '../../src/Prereviewers/Avatars.ts'
import * as fc from '../fc.ts'

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
  it.effect.prop('when there is an avatar', [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatarId]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify(avatarId))

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(avatarId)
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop(
    'when there is something other than an avatar',
    [fc.orcidId(), fc.json().filter(value => typeof value !== 'string')],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.set(orcid, JSON.stringify(value))

        const actual = yield* Effect.result(_.get(orcid))

        expect(actual).toStrictEqual(Result.fail('not-found'))
      }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is no avatar', [fc.orcidId()], ([orcid]) =>
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

describe('save', () => {
  it.effect.prop('stores the avatar', [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatarId]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, avatarId)

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(avatarId)
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatarId]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.save(orcid, avatarId))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('remove', () => {
  it.effect.prop('removes the avatar', [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatarId]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, avatarId)

      yield* _.remove(orcid)

      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail('not-found'))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when there is no avatar', [fc.orcidId()], ([orcid]) =>
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
