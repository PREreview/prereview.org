import { describe, expect, it } from './vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { IsOpenForRequestsStore } from '../src/Prereviewers/index.ts'
import * as _ from '../src/SlackUserIds.ts'
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
  it.effect.prop('when there is a Slack user ID', [fc.orcidId(), fc.slackUserId()], ([orcid, slackUserId]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify({ ...slackUserId, scopes: [...slackUserId.scopes] }))

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(slackUserId)
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is something other than a Slack user ID', [fc.orcidId(), fc.json()], ([orcid, value]) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(orcid, JSON.stringify(value))

      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail('not-found'))
    }).pipe(Effect.provide(Layer.provideMerge(_.layerKeyValueStore, KeyValueStore.layerMemory))),
  )

  it.effect.prop('when there is no Slack user ID', [fc.orcidId()], ([orcid]) =>
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
  it.effect.prop('stores the Slack user ID', [fc.orcidId(), fc.slackUserId()], ([orcid, slackUserId]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, slackUserId)

      const actual = yield* _.get(orcid)

      expect(actual).toStrictEqual(slackUserId)
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when the store is unavailable', [fc.orcidId(), fc.slackUserId()], ([orcid, slackUserId]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.save(orcid, slackUserId))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(Layer.provide(_.layerKeyValueStore, unavailableStore))),
  )
})

describe('remove', () => {
  it.effect.prop('removes the Slack user ID', [fc.orcidId(), fc.slackUserId()], ([orcid, slackUserId]) =>
    Effect.gen(function* () {
      yield* _.save(orcid, slackUserId)

      yield* _.remove(orcid)

      const actual = yield* Effect.result(_.get(orcid))

      expect(actual).toStrictEqual(Result.fail('not-found'))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when there is no Slack user ID', [fc.orcidId()], ([orcid]) =>
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

describe('layerInMemory', () => {
  it.effect.prop(
    'does not share values with other in-memory stores',
    [fc.orcidId(), fc.slackUserId(), fc.isOpenForRequests()],
    ([orcid, slackUserId, isOpenForRequests]) =>
      Effect.gen(function* () {
        yield* _.save(orcid, slackUserId)
        yield* IsOpenForRequestsStore.save(orcid, isOpenForRequests)

        const actual = yield* _.get(orcid)

        expect(actual).toStrictEqual(slackUserId)
      }).pipe(Effect.provide([_.layerInMemory, IsOpenForRequestsStore.layerInMemory])),
  )
})
