import { describe, expect, it } from '../vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as _ from '../../src/Prereviewers/ResearchInterestsStore.ts'
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
  it.effect.prop(
    'when there are research interests',
    [fc.orcidId(), fc.researchInterests()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.set(orcid, JSON.stringify(researchInterests))

        const actual = yield* _.get(orcid)

        expect(actual).toStrictEqual(researchInterests)
      }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop(
    'when there are research interests without a visibility',
    [fc.orcidId(), fc.nonEmptyString()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.set(orcid, JSON.stringify({ value: researchInterests }))

        const actual = yield* _.get(orcid)

        expect(actual).toStrictEqual({ value: researchInterests, visibility: 'restricted' })
      }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop(
    'when there are research interests as a string',
    [fc.orcidId(), fc.nonEmptyString()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.set(orcid, JSON.stringify(researchInterests))

        const actual = yield* _.get(orcid)

        expect(actual).toStrictEqual({ value: researchInterests, visibility: 'restricted' })
      }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop(
    'when there is something other than research interests',
    [
      fc.orcidId(),
      fc
        .json()
        .filter(
          value => typeof value !== 'string' && !(typeof value === 'object' && value !== null && 'value' in value),
        ),
    ],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.set(orcid, JSON.stringify(value))

        const actual = yield* Effect.result(_.get(orcid))

        expect(actual).toStrictEqual(Result.fail('not-found'))
      }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there are no research interests', [fc.orcidId()], ([orcid]) =>
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
  it.effect.prop(
    'stores the research interests',
    [fc.orcidId(), fc.researchInterests()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        yield* _.save(orcid, researchInterests)

        const actual = yield* _.get(orcid)

        expect(actual).toStrictEqual(researchInterests)
      }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop(
    'when the store is unavailable',
    [fc.orcidId(), fc.researchInterests()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.result(_.save(orcid, researchInterests))

        expect(actual).toStrictEqual(Result.fail('unavailable'))
      }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('remove', () => {
  it.effect.prop(
    'removes the research interests',
    [fc.orcidId(), fc.researchInterests()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        yield* _.save(orcid, researchInterests)

        yield* _.remove(orcid)

        const actual = yield* Effect.result(_.get(orcid))

        expect(actual).toStrictEqual(Result.fail('not-found'))
      }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when there are no research interests', [fc.orcidId()], ([orcid]) =>
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
