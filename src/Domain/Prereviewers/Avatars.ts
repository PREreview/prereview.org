import { Context, Data, Effect, Layer, Option, pipe } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { CloudinaryAvatars } from '../../ExternalInteractions/index.ts'
import * as RedisKeyValueStore from '../../RedisKeyValueStore.ts'
import { NonEmptyString, type OrcidId } from '../../types/index.ts'

export class AvatarNotFound extends Data.TaggedError('AvatarNotFound') {}

export class AvatarUnavailable extends Data.TaggedError('AvatarUnavailable')<{ cause?: unknown }> {}

const AvatarIdSchema = NonEmptyString.NonEmptyStringSchema

export class Store extends Context.Service<Store, KeyValueStore.SchemaStore<typeof AvatarIdSchema>>()(
  'Prereviewers/Avatars/Store',
) {}

export const layerKeyValueStore = Layer.effect(
  Store,
  Effect.gen(function* () {
    return KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, AvatarIdSchema)
  }),
)

export const layer = Layer.provide(
  layerKeyValueStore,
  Layer.effect(KeyValueStore.KeyValueStore, RedisKeyValueStore.make('avatar-store')),
)

export const layerInMemory = Layer.provide(layerKeyValueStore, Layer.fresh(KeyValueStore.layerMemory))

export const get = Effect.fn('Avatars.get')(function* (orcid: OrcidId.OrcidId) {
  const avatarId = yield* getAvatarId(orcid)

  return yield* CloudinaryAvatars.avatarUrl(avatarId)
})

export const save = Effect.fn('Avatars.save')(
  function* (orcid: OrcidId.OrcidId, avatar: CloudinaryAvatars.AvatarFile) {
    const { avatarId, existing } = yield* Effect.all(
      { avatarId: CloudinaryAvatars.uploadAvatar(orcid, avatar), existing: maybeGetExistingAvatar(orcid) },
      { concurrency: 'unbounded' },
    )

    yield* saveAvatarId(orcid, avatarId)

    if (Option.isSome(existing)) {
      yield* destroyInBackground(existing.value)
    }
  },
  Effect.catchTag('FailedToUploadAvatar', error => new AvatarUnavailable({ cause: error })),
)

export const remove = Effect.fn('Avatars.remove')(
  function* (orcid: OrcidId.OrcidId) {
    const avatarId = yield* getAvatarId(orcid)

    yield* removeAvatarId(orcid)

    yield* destroyInBackground(avatarId)
  },
  Effect.catchTag('AvatarNotFound', () => Effect.void),
)

const destroyInBackground = (avatarId: NonEmptyString.NonEmptyString) =>
  pipe(CloudinaryAvatars.destroyAvatar(avatarId), Effect.ignore, Effect.forkDetach, Effect.asVoid)

const maybeGetExistingAvatar = (orcid: OrcidId.OrcidId) =>
  pipe(
    getAvatarId(orcid),
    Effect.map(Option.some),
    Effect.catchTag('AvatarNotFound', () => Effect.succeedNone),
  )

const getAvatarId = Effect.fnUntraced(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(
    store.get(orcid),
    Effect.flatMap(Option.match({ onNone: () => Effect.fail(new AvatarNotFound()), onSome: Effect.succeed })),
    Effect.catchTags({
      SchemaError: () => new AvatarNotFound(),
      KeyValueStoreError: unavailable,
    }),
  )
})

const saveAvatarId = Effect.fnUntraced(function* (orcid: OrcidId.OrcidId, avatarId: NonEmptyString.NonEmptyString) {
  const store = yield* Store

  return yield* pipe(
    store.set(orcid, avatarId),
    Effect.catchTags({
      SchemaError: error => new AvatarUnavailable({ cause: error }),
      KeyValueStoreError: unavailable,
    }),
  )
})

const removeAvatarId = Effect.fnUntraced(function* (orcid: OrcidId.OrcidId) {
  const store = yield* Store

  return yield* pipe(store.remove(orcid), Effect.asVoid, Effect.catchTag('KeyValueStoreError', unavailable))
})

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access avatars'),
    Effect.annotateLogs({ error: error.message, method: error.method, key: error.key }),
    Effect.andThen(Effect.fail(new AvatarUnavailable({ cause: error }))),
  )
