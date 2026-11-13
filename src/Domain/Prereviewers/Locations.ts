import { Array, Context, Data, Effect, Layer, Option, pipe, Record, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as RedisKeyValueStore from '../../RedisKeyValueStore.ts'
import { NonEmptyString, OrcidId } from '../../types/index.ts'
import type { Location } from './legacy-location.ts'

export class LocationNotFound extends Data.TaggedError('LocationNotFound') {}

export class LocationUnavailable extends Data.TaggedError('LocationUnavailable')<{ cause?: unknown }> {}

const LocationSchema = Schema.Struct({
  value: NonEmptyString.NonEmptyStringSchema,
  visibility: Schema.Literals(['public', 'restricted']),
}) satisfies Schema.Codec<Location, unknown>

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof LocationSchema>>()(
  'Prereviewers/Locations/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, LocationSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('location')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))

export const get = Effect.fn('Locations.get')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(
    store.get(orcid),
    Effect.flatMap(Option.match({ onNone: () => Effect.fail(new LocationNotFound()), onSome: Effect.succeed })),
    Effect.catchTags({
      SchemaError: () => new LocationNotFound(),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const getAll = Effect.fn('Locations.getAll')(function* () {
  const store = yield* Store

  return yield* pipe(
    store.keys,
    Effect.flatMap(
      Effect.forEach(
        Effect.fnUntraced(function* (key) {
          const orcid = yield* Schema.decodeUnknownEffect(OrcidId.OrcidIdSchema)(key)
          const location = yield* store.get(key)

          return Option.map(location, location => [orcid, location] as const)
        }),
        { concurrency: 10 },
      ),
    ),
    Effect.map(entries => Record.fromEntries(Array.getSomes(entries))),
    Effect.catchTags({
      SchemaError: error => new LocationUnavailable({ cause: error }),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const save = Effect.fn('Locations.save')(function* (orcid: OrcidId.OrcidId, location: Location) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, location),
    Effect.catchTags({
      SchemaError: error => new LocationUnavailable({ cause: error }),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const remove = Effect.fn('Locations.remove')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(store.remove(orcid), Effect.asVoid, Effect.catchTag('KeyValueStoreError', unavailable))
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access locations'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail(new LocationUnavailable({ cause: error }))),
  )
