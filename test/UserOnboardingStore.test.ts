import { describe, expect, it } from './vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as _ from '../src/UserOnboardingStore.ts'
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
  it.effect.prop('when there is user onboarding', [fc.orcidId(), fc.userOnboarding()], ([orcid, userOnboarding]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify(userOnboarding))

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(userOnboarding)
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is something other than user onboarding', [fc.orcidId(), fc.json()], ([orcid, value]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify(value))

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual({ seenMyDetailsPage: false })
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is no user onboarding', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual({ seenMyDetailsPage: false })
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
  it.effect.prop('stores the user onboarding', [fc.orcidId(), fc.userOnboarding()], ([orcid, userOnboarding]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, userOnboarding)

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(userOnboarding)
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId(), fc.userOnboarding()], ([orcid, userOnboarding]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.save(orcid, userOnboarding))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})
