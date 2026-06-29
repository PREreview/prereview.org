import { Command } from '@effect/cli'
import { Array, Console, Data, Effect, pipe, Stream, String } from 'effect'
import { DataStoreRedis } from '../Redis.ts'
import { OrcidId } from '../types/OrcidId.ts'

const program = Effect.gen(function* () {
  const redis = yield* DataStoreRedis

  yield* pipe(
    Stream.fromAsyncIterable<Array<string>, RedisError>(
      redis.scanStream({
        match: 'contact-email-address:*',
      }),
      error => new RedisError({ cause: error }),
    ),
    Stream.flattenIterables,
    Stream.map(String.split(':')),
    Stream.map(Array.lastNonEmpty),
    Stream.map(OrcidId),
    Stream.runForEach(
      Effect.fnUntraced(function* (orcidId) {
        yield* Console.log(orcidId)
      }),
    ),
  )

  yield* Console.log('Done')
})

export const ImportContactAddresses = Command.make('import-contact-addresses', {}, () => program)

class RedisError extends Data.TaggedError('RedisError')<{ cause?: unknown }> {}
