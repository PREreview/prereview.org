import { describe, expect, it } from './vitest.ts'
import { Duration, Effect, Layer } from 'effect'
import { Redis } from 'effect/persistence'
import { SessionStore } from '../src/Context.ts'
import * as _ from '../src/SessionStore.ts'
import * as fc from './fc.ts'
import { shouldNotBeCalled } from './should-not-be-called.ts'

describe('layerInMemory', () => {
  it.effect.prop('stores values', [fc.string(), fc.jsonRecord()], ([key, value]) =>
    Effect.gen(function* () {
      const { store } = yield* SessionStore
      yield* Effect.promise(() => store.set(key, value))

      const actual = yield* Effect.promise(() => store.get(key))

      expect(actual).toStrictEqual(JSON.parse(JSON.stringify(value)))
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('when there is no value', [fc.string()], ([key]) =>
    Effect.gen(function* () {
      const { store } = yield* SessionStore

      const actual = yield* Effect.promise(() => store.get(key))

      expect(actual).toBeUndefined()
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect.prop('removes values', [fc.string(), fc.jsonRecord()], ([key, value]) =>
    Effect.gen(function* () {
      const { store } = yield* SessionStore
      yield* Effect.promise(() => store.set(key, value))

      yield* Effect.promise(() => store.delete(key))

      const actual = yield* Effect.promise(() => store.get(key))

      expect(actual).toBeUndefined()
    }).pipe(Effect.provide(_.layerInMemory)),
  )

  it.effect('uses the session cookie', () =>
    Effect.gen(function* () {
      const { cookie } = yield* SessionStore

      expect(cookie).toStrictEqual('session')
    }).pipe(Effect.provide(_.layerInMemory)),
  )
})

describe('layer', () => {
  it.effect.prop('sessions expire after 30 days', [fc.string(), fc.jsonRecord()], ([key, value]) => {
    const commands: Array<ReadonlyArray<string>> = []

    return Effect.gen(function* () {
      const { store } = yield* SessionStore
      yield* Effect.promise(() => store.set(key, value))

      expect(commands).toContainEqual([
        'SET',
        `sessions:${key}`,
        expect.any(String),
        'PX',
        `${Duration.toMillis('30 days')}`,
      ])
    }).pipe(
      Effect.provide(
        Layer.provide(
          _.layer,
          Layer.succeed(Redis.Redis, {
            send: <A>(command: string, ...args: ReadonlyArray<string>) =>
              Effect.sync(() => {
                commands.push([command, ...args])
                return 'OK' as A
              }),
            eval: shouldNotBeCalled,
            subscribe: shouldNotBeCalled,
            reserve: Effect.sync(shouldNotBeCalled),
          }),
        ),
      ),
    )
  })
})
