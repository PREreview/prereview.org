import { Console, Effect, Exit, pipe } from 'effect'
import { httpCacheRedisUri } from './Redis.ts'

const program = pipe(
  httpCacheRedisUri,
  Effect.tapBoth({
    onSuccess: uri => Console.log(`${uri.hostname} ${uri.port !== '' ? uri.port : '6379'}`),
    onFailure: Console.log,
  }),
)

const result = Effect.runSyncExit(program)

if (Exit.isFailure(result)) {
  process.exit(1)
}

process.exit(0)
