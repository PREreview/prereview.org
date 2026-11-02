import { describe, expect, it } from './vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { Redis } from 'effect/persistence'
import { TestClock } from 'effect/testing'
import * as _ from '../src/RedisKeyValueStore.ts'
import * as fc from './fc.ts'
import { shouldNotBeCalled } from './should-not-be-called.ts'

const redisBackedBy = (data: Map<string, string>, commands: Array<ReadonlyArray<string>> = []) =>
  Layer.succeed(Redis.Redis, {
    send: <A>(command: string, ...args: ReadonlyArray<string>) =>
      Effect.sync(() => {
        commands.push([command, ...args])

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
  it.effect.each<[string, string, string]>([
    ['an object', '{"value":{"name":"Josiah"},"expires":null}', '{"name":"Josiah"}'],
    ['a string', '{"value":"some text","expires":null}', '"some text"'],
    ['a string starting with a colon', '{"value":"::some text","expires":null}', '":some text"'],
    ['a nested string starting with a colon', '{"value":{"list":["::a"]},"expires":null}', '{"list":[":a"]}'],
    ['a value that has not expired', '{"value":true,"expires":9999999999999}', 'true'],
  ])('reads a value in the Keyv format (%s)', ([, stored, expected]) =>
    Effect.gen(function* () {
      const store = yield* _.make('namespace')
      const actual = yield* store.get('key')

      expect(actual).toStrictEqual(expected)
    }).pipe(Effect.provide(redisBackedBy(new Map([['namespace:key', stored]])))),
  )

  it.effect.prop('reads a value it wrote', [fc.string(), fc.string(), fc.json()], ([namespace, key, value]) =>
    Effect.gen(function* () {
      const store = yield* _.make(namespace)
      yield* store.set(key, JSON.stringify(value))

      const actual = yield* store.get(key)

      expect(actual).toStrictEqual(JSON.stringify(value))
    }).pipe(Effect.provide(redisBackedBy(new Map()))),
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
  it.effect.each<[string, string, string]>([
    ['an object', '{"name":"Josiah"}', '{"value":{"name":"Josiah"},"expires":null}'],
    ['a string', '"some text"', '{"value":"some text","expires":null}'],
    ['a string starting with a colon', '":some text"', '{"value":"::some text","expires":null}'],
    ['a nested string starting with a colon', '{"list":[":a"]}', '{"value":{"list":["::a"]},"expires":null}'],
  ])('writes a value in the Keyv format (%s)', ([, value, expected]) => {
    const data = new Map<string, string>()

    return Effect.gen(function* () {
      const store = yield* _.make('namespace')
      yield* store.set('key', value)

      expect(data.get('namespace:key')).toStrictEqual(expected)
    }).pipe(Effect.provide(redisBackedBy(data)))
  })

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
  it.effect.prop('removes a value', [fc.string(), fc.string(), fc.json()], ([namespace, key, value]) => {
    const data = new Map([[`${namespace}:${key}`, JSON.stringify({ value, expires: null })]])

    return Effect.gen(function* () {
      const store = yield* _.make(namespace)
      yield* store.remove(key)

      expect(data.has(`${namespace}:${key}`)).toBeFalsy()
    }).pipe(Effect.provide(redisBackedBy(data)))
  })
})

describe('keys', () => {
  it.effect.prop('lists keys in the namespace', [fc.uniqueArray(fc.string())], ([keys]) => {
    const data = new Map([
      ...keys.map(key => [`namespace:${key}`, '{"value":true,"expires":null}'] as const),
      ['another-namespace:key', '{"value":true,"expires":null}'] as const,
    ])

    return Effect.gen(function* () {
      const store = yield* _.make('namespace')
      const actual = yield* store.keys

      expect(actual).toStrictEqual(keys)
    }).pipe(Effect.provide(redisBackedBy(data)))
  })
})

describe('with a time to live', () => {
  it.effect.prop(
    'sets an expiry',
    [fc.string(), fc.string(), fc.json(), fc.integer({ min: 1, max: 1_000_000 })],
    ([namespace, key, value, timeToLive]) => {
      const commands: Array<ReadonlyArray<string>> = []

      return Effect.gen(function* () {
        const store = yield* _.make(namespace, { timeToLive })
        yield* store.set(key, JSON.stringify(value))

        expect(commands).toContainEqual(['SET', `${namespace}:${key}`, expect.any(String), 'PX', `${timeToLive}`])
      }).pipe(Effect.provide(redisBackedBy(new Map(), commands)))
    },
  )

  it.effect.prop(
    'writes the expiry in the Keyv format',
    [fc.string(), fc.string(), fc.json(), fc.integer({ min: 1, max: 1_000_000 })],
    ([namespace, key, value, timeToLive]) => {
      const data = new Map<string, string>()

      return Effect.gen(function* () {
        yield* TestClock.setTime(1000)
        const store = yield* _.make(namespace, { timeToLive })
        yield* store.set(key, JSON.stringify(value))

        expect(JSON.parse(data.get(`${namespace}:${key}`) ?? '')).toMatchObject({ expires: 1000 + timeToLive })
      }).pipe(Effect.provide(redisBackedBy(data)))
    },
  )

  it.effect.prop(
    'can be read until it expires',
    [fc.string(), fc.string(), fc.json(), fc.integer({ min: 1, max: 1_000_000 })],
    ([namespace, key, value, timeToLive]) =>
      Effect.gen(function* () {
        const store = yield* _.make(namespace, { timeToLive })
        yield* store.set(key, JSON.stringify(value))

        yield* TestClock.adjust(timeToLive)
        const beforeExpiry = yield* store.get(key)

        yield* TestClock.adjust(1)
        const afterExpiry = yield* store.get(key)

        expect(beforeExpiry).toStrictEqual(JSON.stringify(value))
        expect(afterExpiry).toBeUndefined()
      }).pipe(Effect.provide(redisBackedBy(new Map()))),
  )
})
