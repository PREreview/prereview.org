import { describe, expect, it } from './vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { Redis } from 'effect/persistence'
import { TestClock } from 'effect/testing'
import { Keyv } from 'keyv'
import * as _ from '../src/RedisKeyValueStore.ts'
import * as fc from './fc.ts'
import { shouldNotBeCalled } from './should-not-be-called.ts'

const redisBackedBy = (data: Map<string, string>) =>
  Layer.succeed(Redis.Redis, {
    send: <A>(command: string, ...args: ReadonlyArray<string>) =>
      Effect.sync(() => {
        switch (command) {
          case 'GET':
            return (data.get(args[0] ?? '') ?? null) as A
          case 'SET':
            data.set(args[0] ?? '', args[1] ?? '')
            return 'OK' as A
          case 'UNLINK':
            return args.filter(key => data.delete(key)).length as A
          case 'SCAN': {
            const prefix = (args[2] ?? '').slice(0, -1).replaceAll(/\\(.)/g, '$1')
            return ['0', [...data.keys()].filter(key => key.startsWith(prefix))] as A
          }
          default:
            return shouldNotBeCalled()
        }
      }),
    eval: shouldNotBeCalled,
    subscribe: shouldNotBeCalled,
    reserve: Effect.sync(shouldNotBeCalled),
  })

const unavailableRedis = (error: Error) =>
  Layer.succeed(Redis.Redis, {
    send: () => Effect.fail(new Redis.RedisError({ cause: error })),
    eval: shouldNotBeCalled,
    subscribe: shouldNotBeCalled,
    reserve: Effect.sync(shouldNotBeCalled),
  })

describe('get', () => {
  it.effect.prop('reads a value written by Keyv', [fc.string(), fc.string(), fc.json()], ([namespace, key, value]) => {
    const data = new Map<string, string>()

    return Effect.gen(function* () {
      const keyv = new Keyv({ namespace, store: data })
      yield* Effect.promise(() => keyv.set(key, value))

      const store = yield* _.make(namespace)
      const actual = yield* store.get(key)

      expect(actual).toStrictEqual(JSON.stringify(value))
    }).pipe(Effect.provide(redisBackedBy(data)))
  })

  it.effect.prop('when the value has expired', [fc.string(), fc.string(), fc.json()], ([namespace, key, value]) =>
    Effect.gen(function* () {
      yield* TestClock.setTime(1001)

      const store = yield* _.make(namespace)
      const actual = yield* store.get(key)

      expect(actual).toBeUndefined()
    }).pipe(
      Effect.provide(redisBackedBy(new Map([[`${namespace}:${key}`, JSON.stringify({ value, expires: 1000 })]]))),
    ),
  )

  it.effect.prop('when the key is not found', [fc.string(), fc.string()], ([namespace, key]) =>
    Effect.gen(function* () {
      const store = yield* _.make(namespace)
      const actual = yield* store.get(key)

      expect(actual).toBeUndefined()
    }).pipe(Effect.provide(redisBackedBy(new Map()))),
  )

  it.effect.prop(
    'when the value is not in the Keyv format',
    [fc.string(), fc.string(), fc.string()],
    ([namespace, key, value]) =>
      Effect.gen(function* () {
        const store = yield* _.make(namespace)
        const actual = yield* Effect.result(store.get(key))

        expect(actual).toStrictEqual(Result.fail(expect.objectContaining({ _tag: 'KeyValueStoreError' })))
      }).pipe(Effect.provide(redisBackedBy(new Map([[`${namespace}:${key}`, value]])))),
  )

  it.effect.prop('when Redis is unavailable', [fc.string(), fc.string(), fc.error()], ([namespace, key, error]) =>
    Effect.gen(function* () {
      const store = yield* _.make(namespace)
      const actual = yield* Effect.result(store.get(key))

      expect(actual).toStrictEqual(Result.fail(expect.objectContaining({ _tag: 'KeyValueStoreError' })))
    }).pipe(Effect.provide(unavailableRedis(error))),
  )
})

describe('set', () => {
  it.effect.prop('writes a value Keyv can read', [fc.string(), fc.string(), fc.json()], ([namespace, key, value]) => {
    const data = new Map<string, string>()

    return Effect.gen(function* () {
      const store = yield* _.make(namespace)
      yield* store.set(key, JSON.stringify(value))

      const keyv = new Keyv({ namespace, store: data })
      const actual = yield* Effect.promise(() => keyv.get(key))

      expect(actual).toStrictEqual(value)
    }).pipe(Effect.provide(redisBackedBy(data)))
  })

  it.effect.prop('when the value is not JSON', [fc.string(), fc.string()], ([namespace, key]) =>
    Effect.gen(function* () {
      const store = yield* _.make(namespace)
      const actual = yield* Effect.result(store.set(key, '{'))

      expect(actual).toStrictEqual(Result.fail(expect.objectContaining({ _tag: 'KeyValueStoreError' })))
    }).pipe(Effect.provide(redisBackedBy(new Map()))),
  )

  it.effect.prop(
    'when Redis is unavailable',
    [fc.string(), fc.string(), fc.json(), fc.error()],
    ([namespace, key, value, error]) =>
      Effect.gen(function* () {
        const store = yield* _.make(namespace)
        const actual = yield* Effect.result(store.set(key, JSON.stringify(value)))

        expect(actual).toStrictEqual(Result.fail(expect.objectContaining({ _tag: 'KeyValueStoreError' })))
      }).pipe(Effect.provide(unavailableRedis(error))),
  )
})

describe('remove', () => {
  it.effect.prop(
    'removes a value written by Keyv',
    [fc.string(), fc.string(), fc.json()],
    ([namespace, key, value]) => {
      const data = new Map<string, string>()

      return Effect.gen(function* () {
        const keyv = new Keyv({ namespace, store: data })
        yield* Effect.promise(() => keyv.set(key, value))

        const store = yield* _.make(namespace)
        yield* store.remove(key)

        const actual = yield* Effect.promise(() => keyv.get(key))

        expect(actual).toBeUndefined()
      }).pipe(Effect.provide(redisBackedBy(data)))
    },
  )
})

describe('keys', () => {
  it.effect.prop(
    'lists keys written by Keyv',
    [fc.string(), fc.uniqueArray(fc.string()), fc.json()],
    ([namespace, keys, value]) => {
      const data = new Map<string, string>()

      return Effect.gen(function* () {
        const keyv = new Keyv({ namespace, store: data })
        yield* Effect.promise(() => Promise.all(keys.map(key => keyv.set(key, value))))

        const store = yield* _.make(namespace)
        const actual = yield* store.keys

        expect(actual).toStrictEqual(keys)
      }).pipe(Effect.provide(redisBackedBy(data)))
    },
  )
})
