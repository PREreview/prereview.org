import { describe, expect, it } from './vitest.ts'
import { SystemClock } from 'clock-ts'
import { Effect, Record } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import { Keyv } from 'keyv'
import * as _ from '../src/keyv.ts'
import * as fc from './fc.ts'

describe('addToSession', () => {
  it.effect.prop(
    'when there is a session',
    [fc.string(), fc.dictionary(fc.lorem(), fc.string()), fc.lorem(), fc.string()],
    ([sessionId, session, key, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(sessionId, session))

        const actual = yield* Effect.promise(
          _.addToSession(
            sessionId,
            key,
            value,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(sessionId))).toStrictEqual({ ...session, [key]: value })
      }),
  )

  it.effect.prop('when the session is not set', [fc.string(), fc.lorem(), fc.string()], ([sessionId, key, value]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.addToSession(
          sessionId,
          key,
          value,
        )({
          sessionStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(yield* Effect.promise(() => store.has(sessionId))).toBeFalsy()
    }),
  )

  it.effect.prop(
    'when the session cannot be accessed',
    [fc.string(), fc.json(), fc.string(), fc.json(), fc.anything()],
    ([sessionId, session, key, value, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(sessionId, session))
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.addToSession(
            sessionId,
            key,
            value,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
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
        const store = new Keyv()
        yield* Effect.promise(() => store.set(sessionId, { ...session, [key]: value }))

        const actual = yield* Effect.promise(
          _.popFromSession(
            sessionId,
            key,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(value))
        expect(yield* Effect.promise(() => store.get(sessionId))).toStrictEqual(session)
      }),
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
        const store = new Keyv()
        yield* Effect.promise(() => store.set(sessionId, session))

        const actual = yield* Effect.promise(
          _.popFromSession(
            sessionId,
            key,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(yield* Effect.promise(() => store.get(sessionId))).toStrictEqual(session)
      }),
  )

  it.effect.prop('when the session is not found', [fc.string(), fc.lorem()], ([sessionId, key]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.popFromSession(
          sessionId,
          key,
        )({
          sessionStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )

  it.effect.prop(
    'when the session cannot be accessed',
    [fc.string(), fc.lorem(), fc.anything()],
    ([sessionId, key, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.get = (): Promise<never> => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.popFromSession(
            sessionId,
            key,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})
