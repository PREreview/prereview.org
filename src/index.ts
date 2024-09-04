import { NodeRuntime } from '@effect/platform-node'
import cacache from 'cacache'
import { SystemClock } from 'clock-ts'
import * as dns from 'dns'
import { Context, Effect, Layer } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import * as E from 'fp-ts/lib/Either.js'
import { pipe } from 'fp-ts/lib/function.js'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import { Redis } from 'ioredis'
import * as L from 'logger-fp-ts'
import type { app } from './app.js'
import { decodeEnv } from './env.js'
import { expressServer } from './ExpressServer.js'

const env = decodeEnv(process)()

const loggerEnv: L.LoggerEnv = {
  clock: SystemClock,
  logger: pipe(C.log, L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
}

const redis = new Redis(env.REDIS_URI.href, { commandTimeout: 2 * 1000, enableAutoPipelining: true })

redis.on('connect', () => L.debug('Redis connected')(loggerEnv)())
redis.on('close', () => L.debug('Redis connection closed')(loggerEnv)())
redis.on('reconnecting', () => L.info('Redis reconnecting')(loggerEnv)())
redis.removeAllListeners('error')
redis.on('error', (error: Error) => L.errorP('Redis connection error')({ error: error.message })(loggerEnv)())

if (env.ZENODO_URL.href.includes('sandbox')) {
  dns.setDefaultResultOrder('ipv4first')
}

if (env.VERIFY_CACHE) {
  void Promise.resolve()
    .then(() => L.debug('Verifying cache')(loggerEnv)())
    .then(() => cacache.verify('data/cache', { concurrency: 5 }))
    .then((stats: JsonRecord) => L.debugP('Cache verified')(stats)(loggerEnv)())
    .catch((error: unknown) => L.errorP('Failed to verify cache')({ error: E.toError(error).message })(loggerEnv)())
}

class Express extends Context.Tag('Express')<Express, ReturnType<typeof app>>() {}

const expressServerLifecycle = Effect.acquireRelease(
  Effect.gen(function* () {
    const app = yield* Express
    const listeningHttpServer = app.listen(3000)
    L.debug('Server listening')(loggerEnv)()
    return listeningHttpServer
  }),
  server =>
    Effect.promise(async () => {
      L.debug('Shutting server down')(loggerEnv)()
      server.close()

      await redis
        .quit()
        .then(() => L.debug('Redis disconnected')(loggerEnv)())
        .catch((error: unknown) =>
          L.warnP('Redis unable to disconnect')({ error: E.toError(error).message })(loggerEnv)(),
        )
    }),
)

pipe(
  expressServerLifecycle,
  Layer.scopedDiscard,
  Layer.launch,
  Effect.provideServiceEffect(Express, expressServer(redis)),
  NodeRuntime.runMain,
)
