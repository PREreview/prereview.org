import { Context, Data, Effect, Layer, Option, pipe, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as RedisKeyValueStore from '../RedisKeyValueStore.ts'
import { NonEmptyString, type OrcidId } from '../types/index.ts'
import type { Languages } from './legacy-languages.ts'

export class LanguagesNotFound extends Data.TaggedError('LanguagesNotFound') {}

export class LanguagesUnavailable extends Data.TaggedError('LanguagesUnavailable')<{ cause?: unknown }> {}

const LanguagesSchema = Schema.Struct({
  value: NonEmptyString.NonEmptyStringSchema,
  visibility: Schema.Literals(['public', 'restricted']),
}) satisfies Schema.Codec<Languages, unknown>

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof LanguagesSchema>>()(
  'Prereviewers/LanguagesStore/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, LanguagesSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('languages')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))

export const get = Effect.fn('LanguagesStore.get')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(
    store.get(orcid),
    Effect.flatMap(Option.match({ onNone: () => Effect.fail(new LanguagesNotFound()), onSome: Effect.succeed })),
    Effect.catchTags({
      SchemaError: () => new LanguagesNotFound(),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const save = Effect.fn('LanguagesStore.save')(function* (orcid: OrcidId.OrcidId, languages: Languages) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, languages),
    Effect.catchTags({
      SchemaError: error => new LanguagesUnavailable({ cause: error }),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const remove = Effect.fn('LanguagesStore.remove')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(store.remove(orcid), Effect.asVoid, Effect.catchTag('KeyValueStoreError', unavailable))
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access languages'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail(new LanguagesUnavailable({ cause: error }))),
  )
