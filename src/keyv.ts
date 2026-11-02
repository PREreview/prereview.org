import KeyvRedis from '@keyv/redis'
import { Context, Effect, flow, Layer, pipe, type Record } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import type { Json } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { Decoder } from 'io-ts/lib/Decoder.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Encoder } from 'io-ts/lib/Encoder.js'
import * as EN from 'io-ts/lib/Encoder.js'
import { Keyv } from 'keyv'
import * as L from 'logger-fp-ts'
import { AuthorInviteC } from './author-invite.ts'
import type { FormStoreEnv } from './PreprintReviews/index.ts'
import { DataStoreRedis } from './Redis.ts'
import { UuidC } from './types/Uuid.ts'

export { Keyv } from 'keyv'

export class KeyvStores extends Context.Service<KeyvStores, AuthorInviteStoreEnv & FormStoreEnv>()('KeyvStores') {}

export const keyvStoresLayer = Layer.effect(
  KeyvStores,
  Effect.gen(function* () {
    const redis = yield* DataStoreRedis

    const createKeyvStore = () => new KeyvRedis(redis).on('error', () => undefined)

    return {
      authorInviteStore: new Keyv({ emitErrors: false, namespace: 'author-invite', store: createKeyvStore() }),
      formStore: new Keyv({ emitErrors: false, namespace: 'forms', store: createKeyvStore() }),
    }
  }),
)

export interface AuthorInviteStoreEnv {
  authorInviteStore: Keyv
}

export interface SessionStoreEnv {
  sessionStore: Keyv
}

interface KeyvEnv {
  keyv: Keyv
}

const getKey =
  <K, V>(keyEncoder: Encoder<string, K>, valueDecoder: Decoder<unknown, V>) =>
  (key: K): RTE.ReaderTaskEither<KeyvEnv & L.LoggerEnv, 'unavailable' | 'not-found', V> =>
    pipe(
      RTE.ask<KeyvEnv>(),
      RTE.chainW(({ keyv }) =>
        pipe(
          RTE.fromTaskEither(TE.tryCatch(() => keyv.get(keyEncoder.encode(key)), E.toError)),
          RTE.orElseFirstW(
            RTE.fromReaderIOK(
              flow(
                error => ({
                  error: error.message,
                  key: keyEncoder.encode(key),
                  namespace: keyv.opts.namespace as Json,
                }),
                L.errorP('Failed to get key'),
              ),
            ),
          ),
        ),
      ),
      RTE.mapLeft(() => 'unavailable' as const),
      RTE.chainEitherKW(
        flow(
          valueDecoder.decode,
          E.mapLeft(() => 'not-found' as const),
        ),
      ),
    )

const setKey =
  <K, V>(keyEncoder: Encoder<string, K>, valueEncoder: Encoder<unknown, V>) =>
  (key: K, value: V): RTE.ReaderTaskEither<KeyvEnv & L.LoggerEnv, 'unavailable', void> =>
    pipe(
      RTE.ask<KeyvEnv>(),
      RTE.chainW(({ keyv }) =>
        pipe(
          RTE.fromTaskEither(
            TE.tryCatch(async () => {
              await keyv.set(keyEncoder.encode(key), valueEncoder.encode(value))
            }, E.toError),
          ),
          RTE.orElseFirstW(
            RTE.fromReaderIOK(
              flow(
                error => ({
                  error: error.message,
                  key: keyEncoder.encode(key),
                  namespace: keyv.opts.namespace as Json,
                }),
                L.errorP('Failed to set key'),
              ),
            ),
          ),
        ),
      ),
      RTE.mapLeft(() => 'unavailable'),
    )

export const getAuthorInvite = flow(
  getKey(UuidC, AuthorInviteC),
  RTE.local((env: AuthorInviteStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.authorInviteStore })),
)

export const saveAuthorInvite = flow(
  setKey(UuidC, AuthorInviteC),
  RTE.local((env: AuthorInviteStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.authorInviteStore })),
)

export const addToSession = (sessionId: string, key: string, value: Json) =>
  pipe(
    getKey(EN.id<string>(), D.UnknownRecord)(sessionId),
    RTE.mapLeft(() => 'unavailable' as const),
    RTE.chain(session =>
      setKey(EN.id<string>(), EN.id<Record<string, unknown>>())(sessionId, { ...session, [key]: value }),
    ),
    RTE.local((env: SessionStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.sessionStore })),
  )

export const popFromSession = (sessionId: string, key: string) =>
  pipe(
    getKey(EN.id<string>(), D.UnknownRecord)(sessionId),
    RTE.bindTo('session'),
    RTE.bindW(
      'value',
      RTE.fromNullableK('unavailable' as const)(({ session }) => session[key] as Json),
    ),
    RTE.mapLeft(() => 'unavailable' as const),
    RTE.chainFirst(({ session }) =>
      setKey(EN.id<string>(), EN.id<Record<string, unknown>>())(sessionId, { ...session, [key]: undefined }),
    ),
    RTE.map(({ value }) => value),
    RTE.local((env: SessionStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.sessionStore })),
  )
