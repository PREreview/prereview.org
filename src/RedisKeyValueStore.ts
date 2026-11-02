import { Array, Clock, Duration, Effect, Option, pipe, Schema } from 'effect'
import { KeyValueStore, Redis } from 'effect/persistence'

const KeyvEnvelopeSchema = Schema.Struct({ value: Schema.Unknown, expires: Schema.NullOr(Schema.Number) })

export const make = Effect.fnUntraced(function* (
  namespace: string,
  options: { readonly timeToLive?: Duration.Input } = {},
) {
  const timeToLive = Option.map(Option.fromUndefinedOr(options.timeToLive), Duration.fromInputUnsafe)
  const redis = yield* Redis.Redis

  const keyFor = (key: string) => `${namespace}:${key}`

  const send =
    (method: string, key?: string) =>
    <A>(command: string, ...args: ReadonlyArray<string>) =>
      Effect.mapError(
        redis.send<A>(command, ...args),
        cause => new KeyValueStore.KeyValueStoreError({ message: `Unable to ${method}`, method, key, cause }),
      )

  const scan = (cursor: string): Effect.Effect<ReadonlyArray<string>, KeyValueStore.KeyValueStoreError> =>
    pipe(
      send('keys')<[string, ReadonlyArray<string>]>('SCAN', cursor, 'MATCH', `${escapeRedisGlob(namespace)}:*`),
      Effect.flatMap(([nextCursor, batch]) =>
        nextCursor === '0' ? Effect.succeed(batch) : Effect.map(scan(nextCursor), Array.appendAll(batch)),
      ),
    )

  const keys = pipe(
    scan('0'),
    Effect.map(found => Array.dedupe(Array.map(found, key => key.slice(namespace.length + 1)))),
  )

  return KeyValueStore.makeStringOnly({
    get: key =>
      Effect.gen(function* () {
        const raw = yield* send('get', key)<string | null>('GET', keyFor(key))

        if (raw === null) {
          return undefined
        }

        const envelope = yield* pipe(
          Effect.try({
            try: () => JSON.parse(raw, unescapeKeyvString) as unknown,
            catch: cause =>
              new KeyValueStore.KeyValueStoreError({ message: 'Unable to parse', method: 'get', key, cause }),
          }),
          Effect.flatMap(Schema.decodeUnknownEffect(KeyvEnvelopeSchema)),
          Effect.mapError(
            cause => new KeyValueStore.KeyValueStoreError({ message: 'Unable to decode', method: 'get', key, cause }),
          ),
        )

        if (typeof envelope.expires === 'number' && (yield* Clock.currentTimeMillis) > envelope.expires) {
          return undefined
        }

        return JSON.stringify(envelope.value)
      }),
    set: (key, value) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis
        const expires = Option.map(timeToLive, timeToLive => now + Duration.toMillis(timeToLive))

        const envelope = yield* Effect.try({
          try: () =>
            JSON.stringify(
              { value: JSON.parse(value) as unknown, expires: Option.getOrNull(expires) },
              escapeKeyvString,
            ),
          catch: cause =>
            new KeyValueStore.KeyValueStoreError({ message: 'Unable to encode', method: 'set', key, cause }),
        })

        yield* Option.match(timeToLive, {
          onNone: () => send('set', key)('SET', keyFor(key), envelope),
          onSome: timeToLive =>
            send('set', key)('SET', keyFor(key), envelope, 'PX', Duration.toMillis(timeToLive).toString()),
        })
      }),
    remove: key => Effect.asVoid(send('remove', key)('UNLINK', keyFor(key))),
    clear: pipe(
      keys,
      Effect.flatMap(found =>
        Array.isReadonlyArrayNonEmpty(found)
          ? Effect.asVoid(send('clear')('UNLINK', ...Array.map(found, keyFor)))
          : Effect.void,
      ),
    ),
    size: Effect.map(keys, Array.length),
    keys,
  })
})

const escapeRedisGlob = (pattern: string) => pattern.replaceAll(/[*?[\]\\]/g, '\\$&')

const escapeKeyvString = (_: string, value: unknown) =>
  typeof value === 'string' && value.startsWith(':') ? `:${value}` : value

const unescapeKeyvString = (_: string, value: unknown) =>
  typeof value === 'string' && value.startsWith(':') ? value.slice(1) : value
