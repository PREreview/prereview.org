import { describe, expect, it } from './vitest.ts'
import { Effect, Layer, Result } from 'effect'
import { Redis } from 'effect/persistence'
import type { Redis as IoRedis } from 'ioredis'
import * as _ from '../src/Redis.ts'
import * as fc from './fc.ts'

describe('layerPersistenceFromDataStore', () => {
  describe('send', () => {
    it.effect.prop('sends the command', [fc.string(), fc.array(fc.string()), fc.json()], ([command, args, reply]) => {
      const calls: Array<ReadonlyArray<string>> = []
      const ioRedis = {
        call: (...call: ReadonlyArray<string>) => {
          calls.push(call)
          return Promise.resolve(reply)
        },
      } as unknown as IoRedis

      return Effect.gen(function* () {
        const redis = yield* Redis.Redis
        const actual = yield* redis.send(command, ...args)

        expect(actual).toStrictEqual(reply)
        expect(calls).toStrictEqual([[command, ...args]])
      }).pipe(Effect.provide(Layer.provide(_.layerPersistenceFromDataStore, Layer.succeed(_.DataStoreRedis, ioRedis))))
    })

    it.effect.prop('when the command fails', [fc.string(), fc.error()], ([command, error]) =>
      Effect.gen(function* () {
        const redis = yield* Redis.Redis
        const actual = yield* Effect.result(redis.send(command))

        expect(actual).toStrictEqual(Result.fail(new Redis.RedisError({ cause: error })))
      }).pipe(
        Effect.provide(
          Layer.provide(
            _.layerPersistenceFromDataStore,
            Layer.succeed(_.DataStoreRedis, { call: () => Promise.reject(error) } as unknown as IoRedis),
          ),
        ),
      ),
    )
  })
})
