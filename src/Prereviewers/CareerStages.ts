import { Array, Context, Effect, Layer, Option, pipe, Record, Schema, SchemaTransformation, Struct } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as RedisKeyValueStore from '../RedisKeyValueStore.ts'
import { OrcidId } from '../types/index.ts'
import type { CareerStage } from './legacy-career-stage.ts'

const CareerStageValueSchema = Schema.Literals(['early', 'mid', 'late'])

const CareerStageSchema = Schema.Struct({
  value: CareerStageValueSchema,
  visibility: Schema.Literals(['public', 'restricted']),
}) satisfies Schema.Codec<CareerStage, unknown>

const StoredCareerStageSchema = Schema.Union([
  CareerStageSchema,
  CareerStageValueSchema.pipe(
    Schema.decodeTo(
      CareerStageSchema,
      SchemaTransformation.transform({
        decode: (value): CareerStage => ({ value, visibility: 'restricted' }),
        encode: Struct.get('value'),
      }),
    ),
  ),
])

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof StoredCareerStageSchema>>()(
  'Prereviewers/CareerStages/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, StoredCareerStageSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('career-stage')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))

export const get = Effect.fn('CareerStages.get')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(
    store.get(orcid),
    Effect.flatMap(Option.match({ onNone: () => Effect.fail('not-found' as const), onSome: Effect.succeed })),
    Effect.catchTags({
      SchemaError: () => Effect.fail('not-found' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const getAll = Effect.fn('CareerStages.getAll')(function* () {
  const store = yield* Store

  return yield* pipe(
    store.keys,
    Effect.flatMap(
      Effect.forEach(
        Effect.fnUntraced(function* (key) {
          const orcid = yield* Schema.decodeUnknownEffect(OrcidId.OrcidIdSchema)(key)
          const careerStage = yield* store.get(key)

          return Option.map(careerStage, careerStage => [orcid, careerStage] as const)
        }),
        { concurrency: 10 },
      ),
    ),
    Effect.map(entries => Record.fromEntries(Array.getSomes(entries))),
    Effect.catchTags({
      SchemaError: () => Effect.fail('unavailable' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const save = Effect.fn('CareerStages.save')(function* (orcid: OrcidId.OrcidId, careerStage: CareerStage) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, careerStage),
    Effect.catchTags({
      SchemaError: () => Effect.fail('unavailable' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const remove = Effect.fn('CareerStages.remove')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(store.remove(orcid), Effect.asVoid, Effect.catchTag('KeyValueStoreError', unavailable))
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access career stages'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail('unavailable' as const)),
  )
