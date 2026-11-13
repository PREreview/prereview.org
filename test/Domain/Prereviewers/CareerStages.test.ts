import { describe, expect, it } from '../../vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as _ from '../../../src/Domain/Prereviewers/CareerStages.ts'
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
  it.effect.prop('when there is a career stage', [fc.orcidId(), fc.careerStage()], ([orcid, careerStage]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify(careerStage))

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(careerStage)
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop(
    'when there is a career stage in the old format',
    [fc.orcidId(), fc.careerStageValue()],
    ([orcid, careerStage]) =>
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.set(orcid, JSON.stringify(careerStage))

        const actual = yield* _.get(orcid)

        expect(actual).toStrictEqual({ value: careerStage, visibility: 'restricted' })
      }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop(
    'when there is something other than a career stage',
    [fc.orcidId(), fc.json().filter(value => !['early', 'mid', 'late'].includes(value as string))],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.set(orcid, JSON.stringify(value))

        const actual = yield* Effect.result(_.get(orcid))

        expect(actual).toStrictEqual(Result.fail(new _.CareerStageNotFound()))
      }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is no career stage', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail(new _.CareerStageNotFound()))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail(expect.any(_.CareerStageUnavailable)))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('getAll', () => {
  it.effect.prop(
    'returns all career stages',
    [fc.uniqueArray(fc.tuple(fc.orcidId(), fc.careerStage()), { selector: ([orcid]) => orcid })],
    ([careerStages]) =>
      Effect.gen(function* () {
        yield* Effect.forEach(careerStages, ([orcid, careerStage]) => _.save(orcid, careerStage))

        const actual = yield* _.getAll()

        expect(actual).toStrictEqual(Object.fromEntries(careerStages))
      }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect('when the store is unavailable', () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.getAll())

      expect(actual).toStrictEqual(Result.fail(expect.any(_.CareerStageUnavailable)))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('save', () => {
  it.effect.prop('stores the career stage', [fc.orcidId(), fc.careerStage()], ([orcid, careerStage]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, careerStage)

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(careerStage)
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId(), fc.careerStage()], ([orcid, careerStage]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.save(orcid, careerStage))

      expect(actual).toStrictEqual(Result.fail(expect.any(_.CareerStageUnavailable)))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('remove', () => {
  it.effect.prop('removes the career stage', [fc.orcidId(), fc.careerStage()], ([orcid, careerStage]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, careerStage)

      yield* _.remove(orcid)

      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail(new _.CareerStageNotFound()))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when there is no career stage', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* _.remove(orcid)

      expect(actual).toBeUndefined()
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.remove(orcid))

      expect(actual).toStrictEqual(Result.fail(expect.any(_.CareerStageUnavailable)))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})
