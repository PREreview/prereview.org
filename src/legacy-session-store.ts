import { Effect, Option, pipe, Schema } from 'effect'
import type { KeyValueStore } from 'effect/persistence'
import type { Json } from 'fp-ts/lib/Json.js'
import { SessionStore } from './Context.ts'

const SessionSchema = Schema.Record(Schema.String, Schema.Unknown)

const getSession = Effect.fnUntraced(function* (sessionId: string) {
  const { store } = yield* SessionStore

  return yield* pipe(
    store.get(sessionId),
    Effect.flatMap(Effect.fromOption),
    Effect.flatMap(Schema.decodeUnknownEffect(SessionSchema)),
  )
})

export const addToSession = Effect.fn('addToSession')(
  function* (sessionId: string, key: string, value: Json) {
    const { store } = yield* SessionStore
    const session = yield* getSession(sessionId)

    yield* store.set(sessionId, { ...session, [key]: value })
  },
  Effect.catchTag('KeyValueStoreError', error => unavailable(error)),
  Effect.mapError(() => 'unavailable' as const),
)

export const popFromSession = Effect.fn('popFromSession')(
  function* (sessionId: string, key: string) {
    const { store } = yield* SessionStore
    const session = yield* getSession(sessionId)
    const value = yield* Effect.fromOption(Option.fromNullishOr(session[key] as Json))

    yield* store.set(sessionId, { ...session, [key]: undefined })

    return value
  },
  Effect.catchTag('KeyValueStoreError', error => unavailable(error)),
  Effect.mapError(() => 'unavailable' as const),
)

const unavailable = (error: KeyValueStore.KeyValueStoreError) =>
  pipe(
    Effect.logError('Unable to access session'),
    Effect.annotateLogs({ error: error.message, method: error.method }),
    Effect.andThen(Effect.fail('unavailable' as const)),
  )
