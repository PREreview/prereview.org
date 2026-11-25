import { Effect, Layer, Option, Result, Schema } from 'effect'
import * as _ from '../../src/EventSourcing/SensitiveData.ts'
import { SensitiveDataStore } from '../../src/EventSourcing/SensitiveDataStore.ts'
import * as fc from '../fc.ts'
import { describe, expect, it } from '../vitest.ts'

const schema = _.LazySensitiveData(Schema.String)

describe('LazySensitiveData', () => {
  it.effect.prop('decoding gives a reference without reading the store', [fc.uuid()], ([id]) =>
    Effect.gen(function* () {
      const actual = yield* Schema.decodeEffect(schema)(id)

      expect(actual).toStrictEqual(new _.SensitiveDataReference({ id }))
    }).pipe(Effect.provide(Layer.mock(SensitiveDataStore, {}))),
  )

  it.effect.prop('encoding a new value stores it', [fc.string(), fc.uuid()], ([value, id]) =>
    Effect.gen(function* () {
      const actual = yield* Schema.encodeEffect(schema)(Option.some(value))

      expect(actual).toStrictEqual(id)
    }).pipe(
      Effect.provide(
        Layer.mock(SensitiveDataStore, {
          add: stored => (stored === JSON.stringify(value) ? Effect.succeed(id) : Effect.die('unexpected value')),
        }),
      ),
    ),
  )

  it.effect.prop('encoding a reference gives its ID without storing anything', [fc.uuid()], ([id]) =>
    Effect.gen(function* () {
      const actual = yield* Schema.encodeEffect(schema)(new _.SensitiveDataReference({ id }))

      expect(actual).toStrictEqual(id)
    }).pipe(Effect.provide(Layer.mock(SensitiveDataStore, {}))),
  )

  it.effect('encoding nothing fails', () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(Schema.encodeEffect(schema)(Option.none()))

      expect(actual).toStrictEqual(Result.fail(expect.objectContaining({ _tag: 'SchemaError' })))
    }).pipe(Effect.provide(Layer.mock(SensitiveDataStore, {}))),
  )
})

describe('resolveSensitiveData', () => {
  it.effect.prop('when the value is stored', [fc.uuid(), fc.string()], ([id, value]) =>
    Effect.gen(function* () {
      const actual = yield* _.resolveSensitiveData(Schema.String)(new _.SensitiveDataReference({ id }))

      expect(actual).toStrictEqual(Option.some(value))
    }).pipe(
      Effect.provide(
        Layer.mock(SensitiveDataStore, { getMany: () => Effect.succeed({ [id]: JSON.stringify(value) }) }),
      ),
    ),
  )

  it.effect.prop('when the value has been removed', [fc.uuid()], ([id]) =>
    Effect.gen(function* () {
      const actual = yield* _.resolveSensitiveData(Schema.String)(new _.SensitiveDataReference({ id }))

      expect(actual).toStrictEqual(Option.none())
    }).pipe(Effect.provide(Layer.mock(SensitiveDataStore, { getMany: () => Effect.succeed({}) }))),
  )
})
