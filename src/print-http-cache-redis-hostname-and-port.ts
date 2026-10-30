import { Console, Effect, Exit, pipe } from 'effect'
import { httpCacheRedisUri } from './Redis.ts'

const program = pipe(
  httpCacheRedisUri,
  Effect.tap(uri => Console.log(`${uri.hostname} ${uri.port !== '' ? uri.port : '6379'}`)),
  Effect.tapError(Console.log),
)

const result = Effect.runSyncExit(program)

if (Exit.isFailure(result)) {
  process.exit(1)
}

process.exit(0)
