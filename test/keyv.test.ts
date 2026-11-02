import { describe, expect, it } from './vitest.ts'
import { SystemClock } from 'clock-ts'
import { Effect, Record } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import { Keyv } from 'keyv'
import * as _ from '../src/keyv.ts'
import * as fc from './fc.ts'

describe('getAuthorInvite', () => {
  it.effect.prop('when the key contains an author invite', [fc.uuid(), fc.authorInvite()], ([uuid, authorInvite]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(uuid, authorInvite))

      const actual = yield* Effect.promise(
        _.getAuthorInvite(uuid)({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(authorInvite))
    }),
  )

  it.effect.prop(
    'when the key contains something other than author invite',
    [fc.uuid(), fc.anything()],
    ([uuid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(uuid, value))

        const actual = yield* Effect.promise(
          _.getAuthorInvite(uuid)({
            authorInviteStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.uuid()], ([uuid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getAuthorInvite(uuid)({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.uuid(), fc.anything()], ([uuid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getAuthorInvite(uuid)({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveAuthorInvite', () => {
  it.effect.prop('when the key contains an author invite', [fc.uuid(), fc.authorInvite()], ([uuid, authorInvite]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(uuid, authorInvite))

      const actual = yield* Effect.promise(
        _.saveAuthorInvite(
          uuid,
          authorInvite,
        )({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(uuid))).toStrictEqual(authorInvite)
    }),
  )

  it.effect.prop(
    'when the key already contains something other than an author invite',
    [fc.uuid(), fc.anything(), fc.authorInvite()],
    ([uuid, value, authorInvite]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(uuid, value))

        const actual = yield* Effect.promise(
          _.saveAuthorInvite(
            uuid,
            authorInvite,
          )({
            authorInviteStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(uuid))).toStrictEqual(authorInvite)
      }),
  )

  it.effect.prop('when the key is not set', [fc.uuid(), fc.authorInvite()], ([uuid, authorInvite]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveAuthorInvite(
          uuid,
          authorInvite,
        )({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(uuid))).toStrictEqual(authorInvite)
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.uuid(), fc.authorInvite(), fc.anything()],
    ([uuid, authorInvite, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveAuthorInvite(
            uuid,
            authorInvite,
          )({
            authorInviteStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

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
