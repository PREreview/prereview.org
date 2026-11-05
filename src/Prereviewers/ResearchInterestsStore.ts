import { Context, Data, Effect, Layer, Option, pipe, Schema, SchemaTransformation, Struct } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as RedisKeyValueStore from '../RedisKeyValueStore.ts'
import { NonEmptyString, type OrcidId } from '../types/index.ts'
import type { ResearchInterests } from './legacy-research-interests.ts'

export class ResearchInterestsNotFound extends Data.TaggedError('ResearchInterestsNotFound') {}

export class ResearchInterestsUnavailable extends Data.TaggedError('ResearchInterestsUnavailable')<{
  cause?: unknown
}> {}

const ResearchInterestsSchema = Schema.Struct({
  value: NonEmptyString.NonEmptyStringSchema,
  visibility: Schema.Literals(['public', 'restricted']),
}) satisfies Schema.Codec<ResearchInterests, unknown>

const StoredResearchInterestsSchema = Schema.Union([
  ResearchInterestsSchema,
  Schema.Struct({ value: NonEmptyString.NonEmptyStringSchema }).pipe(
    Schema.decodeTo(
      Schema.toType(ResearchInterestsSchema),
      SchemaTransformation.transform({
        decode: ({ value }): ResearchInterests => ({ value, visibility: 'restricted' }),
        encode: ({ value }) => ({ value }),
      }),
    ),
  ),
  NonEmptyString.NonEmptyStringSchema.pipe(
    Schema.decodeTo(
      Schema.toType(ResearchInterestsSchema),
      SchemaTransformation.transform({
        decode: (value): ResearchInterests => ({ value, visibility: 'restricted' }),
        encode: Struct.get('value'),
      }),
    ),
  ),
])

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof StoredResearchInterestsSchema>>()(
  'Prereviewers/ResearchInterestsStore/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, StoredResearchInterestsSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('research-interests')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))

export const get = Effect.fn('ResearchInterestsStore.get')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(
    store.get(orcid),
    Effect.flatMap(
      Option.match({ onNone: () => Effect.fail(new ResearchInterestsNotFound()), onSome: Effect.succeed }),
    ),
    Effect.catchTags({
      SchemaError: () => new ResearchInterestsNotFound(),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const save = Effect.fn('ResearchInterestsStore.save')(function* (
  orcid: OrcidId.OrcidId,
  researchInterests: ResearchInterests,
) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, researchInterests),
    Effect.catchTags({
      SchemaError: error => new ResearchInterestsUnavailable({ cause: error }),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const remove = Effect.fn('ResearchInterestsStore.remove')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(store.remove(orcid), Effect.asVoid, Effect.catchTag('KeyValueStoreError', unavailable))
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access research interests'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail(new ResearchInterestsUnavailable({ cause: error }))),
  )
