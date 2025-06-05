import { Config, Console, Effect, Exit, pipe } from 'effect'

const httpCacheRedisUri = Config.url('HTTP_CACHE_REDIS_URI').pipe(
  Config.orElse(() =>
    Config.all({
      uriTemplate: Config.string('HTTP_CACHE_REDIS_URI_TEMPLATE'),
      region: Config.nonEmptyString('FLY_REGION'),
    }).pipe(Config.map(({ uriTemplate, region }) => new URL(uriTemplate.replace('{region}', region)))),
  ),
)

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
