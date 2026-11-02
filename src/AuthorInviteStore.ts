import { Context, Effect, Layer, Option, pipe, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import type { AuthorInvite } from './author-invite.ts'
import * as RedisKeyValueStore from './RedisKeyValueStore.ts'
import { EmailAddress, OrcidId, type Uuid } from './types/index.ts'

const AuthorInviteSchema = Schema.Union([
  Schema.Struct({
    status: Schema.Literal('open'),
    emailAddress: EmailAddress.EmailAddressSchema,
    review: Schema.Number,
  }),
  Schema.Struct({
    status: Schema.Literal('declined'),
    review: Schema.Number,
  }),
  Schema.Struct({
    status: Schema.Literal('assigned'),
    emailAddress: EmailAddress.EmailAddressSchema,
    orcid: OrcidId.OrcidIdSchema,
    persona: Schema.optionalKey(Schema.Literals(['public', 'pseudonym'])),
    review: Schema.Number,
  }),
  Schema.Struct({
    status: Schema.Literal('completed'),
    orcid: OrcidId.OrcidIdSchema,
    review: Schema.Number,
  }),
]) satisfies Schema.Codec<AuthorInvite, unknown>

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof AuthorInviteSchema>>()(
  'AuthorInviteStore/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, AuthorInviteSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('author-invite')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))

export const get = Effect.fn('AuthorInviteStore.get')(function* (id: Uuid.Uuid) {
  const store = yield* Store

  return yield* pipe(
    store.get(id),
    Effect.flatMap(Option.match({ onNone: () => Effect.fail('not-found' as const), onSome: Effect.succeed })),
    Effect.catchTags({
      SchemaError: () => Effect.fail('not-found' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

export const save = Effect.fn('AuthorInviteStore.save')(function* (id: Uuid.Uuid, authorInvite: AuthorInvite) {
  const store = yield* Store

  return yield* pipe(
    store.set(id, authorInvite),
    Effect.catchTags({
      SchemaError: () => Effect.fail('unavailable' as const),
      KeyValueStoreError: unavailable,
    }),
  )
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access author invites'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail('unavailable' as const)),
  )
