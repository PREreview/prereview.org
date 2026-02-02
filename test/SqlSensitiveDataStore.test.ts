import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { it } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Layer, Option } from 'effect'
import * as _ from '../src/SqlSensitiveDataStore.ts'
import { Uuid } from '../src/types/index.ts'
import * as EffectTest from './EffectTest.ts'
import * as fc from './fc.ts'

it.prop([fc.uuid()])('might not find a value', id =>
  Effect.gen(function* () {
    const sensitiveDataStore = yield* _.make

    const value = yield* sensitiveDataStore.get(id)

    expect(value).toStrictEqual(Option.none())
  }).pipe(Effect.provide(Layer.mergeAll(Uuid.layer, TestLibsqlClient)), EffectTest.run),
)

it.prop([fc.string()])('can add and retrieve a value', input =>
  Effect.gen(function* () {
    const sensitiveDataStore = yield* _.make

    const id = yield* sensitiveDataStore.add(input)

    const value = yield* sensitiveDataStore.get(id)

    expect(value).toStrictEqual(Option.some(input))
  }).pipe(Effect.provide(Layer.mergeAll(Uuid.layer, TestLibsqlClient)), EffectTest.run),
)

it.prop([fc.string(), fc.string(), fc.string(), fc.uuid()])(
  'can add and retrieve multiple values',
  (input1, input2, input3, id4) =>
    Effect.gen(function* () {
      const sensitiveDataStore = yield* _.make

      const id1 = yield* sensitiveDataStore.add(input1)
      const id2 = yield* sensitiveDataStore.add(input2)
      const id3 = yield* sensitiveDataStore.add(input3)

      expect(yield* sensitiveDataStore.getMany([id1])).toStrictEqual({ [id1]: input1 })
      expect(yield* sensitiveDataStore.getMany([id4])).toStrictEqual({})
      expect(yield* sensitiveDataStore.getMany([id1, id3])).toStrictEqual({ [id1]: input1, [id3]: input3 })
      expect(yield* sensitiveDataStore.getMany([id1, id2, id3, id4])).toStrictEqual({
        [id1]: input1,
        [id2]: input2,
        [id3]: input3,
      })
    }).pipe(Effect.provide(Layer.mergeAll(Uuid.layer, TestLibsqlClient)), EffectTest.run),
)

const TestLibsqlClient = Layer.unwrapScoped(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const file = yield* fs.makeTempFileScoped()

    return LibsqlClient.layer({ url: `file:${file}` })
  }),
).pipe(Layer.provide(NodeFileSystem.layer))
