import { describe, expect, it } from './vitest.ts'
import { Effect, Option, Record, Result } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { SessionStore } from '../src/Context.ts'
import * as _ from '../src/legacy-session-store.ts'
import { layerInMemory } from '../src/SessionStore.ts'
import * as fc from './fc.ts'

describe('addToSession', () => {
  it.effect.prop(
    'when there is a session',
    [fc.string(), fc.dictionary(fc.lorem(), fc.string()), fc.lorem(), fc.string()],
    ([sessionId, session, key, value]) =>
      Effect.gen(function* () {
        const { store } = yield* SessionStore
        yield* store.set(sessionId, session)

        const actual = yield* Effect.result(_.addToSession(sessionId, key, value))

        expect(actual).toStrictEqual(Result.void)
        expect(yield* store.get(sessionId)).toStrictEqual(Option.some({ ...session, [key]: value }))
      }).pipe(Effect.provide(layerInMemory)),
  )

  it.effect.prop('when the session is not set', [fc.string(), fc.lorem(), fc.string()], ([sessionId, key, value]) =>
    Effect.gen(function* () {
      const { store } = yield* SessionStore

      const actual = yield* Effect.result(_.addToSession(sessionId, key, value))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
      expect(yield* store.get(sessionId)).toStrictEqual(Option.none())
    }).pipe(Effect.provide(layerInMemory)),
  )

  it.effect.prop(
    'when the session cannot be accessed',
    [fc.string(), fc.json(), fc.string(), fc.json(), fc.anything()],
    ([sessionId, session, key, value, error]) =>
      Effect.gen(function* () {
        const { cookie, store } = yield* SessionStore
        yield* store.set(sessionId, session)

        const actual = yield* Effect.result(
          Effect.provideService(_.addToSession(sessionId, key, value), SessionStore, {
            cookie,
            store: {
              ...store,
              set: () =>
                Effect.fail(
                  new KeyValueStore.KeyValueStoreError({ message: 'Unavailable', method: 'set', cause: error }),
                ),
            },
          }),
        )

        expect(actual).toStrictEqual(Result.fail('unavailable'))
      }).pipe(Effect.provide(layerInMemory)),
  )
})

describe('popFromSession', () => {
  it.effect.prop(
    'when the session contains the key',
    [
      fc.string(),
      fc
        .tuple(fc.dictionary(fc.lorem(), fc.string()), fc.lorem())
        .filter(([session, key]) => !Record.has(session, key)),
      fc.string(),
    ],
    ([sessionId, [session, key], value]) =>
      Effect.gen(function* () {
        const { store } = yield* SessionStore
        yield* store.set(sessionId, { ...session, [key]: value })

        const actual = yield* Effect.result(_.popFromSession(sessionId, key))

        expect(actual).toStrictEqual(Result.succeed(value))
        expect(yield* store.get(sessionId)).toStrictEqual(Option.some(session))
      }).pipe(Effect.provide(layerInMemory)),
  )

  it.effect.prop(
    'when the key is not found in the session',
    [
      fc.string(),
      fc
        .tuple(fc.dictionary(fc.lorem(), fc.string()), fc.lorem())
        .filter(([session, key]) => !Record.has(session, key)),
    ],
    ([sessionId, [session, key]]) =>
      Effect.gen(function* () {
        const { store } = yield* SessionStore
        yield* store.set(sessionId, session)

        const actual = yield* Effect.result(_.popFromSession(sessionId, key))

        expect(actual).toStrictEqual(Result.fail('unavailable'))
        expect(yield* store.get(sessionId)).toStrictEqual(Option.some(session))
      }).pipe(Effect.provide(layerInMemory)),
  )

  it.effect.prop('when the session is not found', [fc.string(), fc.lorem()], ([sessionId, key]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.popFromSession(sessionId, key))

      expect(actual).toStrictEqual(Result.fail('unavailable'))
    }).pipe(Effect.provide(layerInMemory)),
  )

  it.effect.prop(
    'when the session cannot be accessed',
    [fc.string(), fc.lorem(), fc.anything()],
    ([sessionId, key, error]) =>
      Effect.gen(function* () {
        const { cookie, store } = yield* SessionStore

        const actual = yield* Effect.result(
          Effect.provideService(_.popFromSession(sessionId, key), SessionStore, {
            cookie,
            store: {
              ...store,
              get: () =>
                Effect.fail(
                  new KeyValueStore.KeyValueStoreError({ message: 'Unavailable', method: 'get', cause: error }),
                ),
            },
          }),
        )

        expect(actual).toStrictEqual(Result.fail('unavailable'))
      }).pipe(Effect.provide(layerInMemory)),
  )
})
