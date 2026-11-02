import { Array, Context, Effect, Layer, Option, pipe, Record, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import type { OrcidToken } from './orcid-token.ts'
import * as RedisKeyValueStore from './RedisKeyValueStore.ts'
import { NonEmptyString, OrcidId } from './types/index.ts'

const OrcidTokenSchema = Schema.Struct({
  accessToken: NonEmptyString.NonEmptyStringSchema,
  scopes: Schema.HashSet(NonEmptyString.NonEmptyStringSchema),
}) satisfies Schema.Codec<OrcidToken, unknown>

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof OrcidTokenSchema>>()(
  'OrcidTokens/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, OrcidTokenSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('orcid-token')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, KeyValueStore.layerMemory)

export const get = Effect.fn('OrcidTokens.get')(function* (orcid: OrcidId.OrcidId) {
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

export const getAll = Effect.fn('OrcidTokens.getAll')(function* () {
  const store = yield* Store

  return yield* pipe(
    store.keys,
    Effect.flatMap(
      Effect.forEach(
        Effect.fnUntraced(function* (key) {
          const orcid = yield* Schema.decodeUnknownEffect(OrcidId.OrcidIdSchema)(key)
          const orcidToken = yield* store.get(key)

          return Option.map(orcidToken, orcidToken => [orcid, orcidToken] as const)
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

export const save = Effect.fn('OrcidTokens.save')(function* (orcid: OrcidId.OrcidId, orcidToken: OrcidToken) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, orcidToken),
    Effect.catchTags({
      SchemaError: () => Effect.fail('unavailable' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const remove = Effect.fn('OrcidTokens.remove')(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(store.remove(orcid), Effect.asVoid, Effect.catchTag('KeyValueStoreError', unavailable))
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access ORCID tokens'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail('unavailable' as const)),
  )
