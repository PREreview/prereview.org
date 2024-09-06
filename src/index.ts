import { NodeRuntime } from '@effect/platform-node'
import cacache from 'cacache'
import { SystemClock } from 'clock-ts'
import * as dns from 'dns'
import { Effect, Layer } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import * as E from 'fp-ts/lib/Either.js'
import { pipe } from 'fp-ts/lib/function.js'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import * as L from 'logger-fp-ts'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, Express, Redis } from './Context.js'
import { decodeEnv } from './env.js'
import { expressServer } from './ExpressServer.js'
import { expressServerLifecycle } from './ExpressServerLifecycle.js'
import { redisLifecycle } from './Redis.js'

const env = decodeEnv(process)()

const loggerEnv: L.LoggerEnv = {
  clock: SystemClock,
  logger: pipe(C.log, L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
}

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

pipe(
  expressServerLifecycle,
  Layer.scopedDiscard,
  Layer.launch,
  Effect.provideServiceEffect(Express, expressServer),
  Effect.provideServiceEffect(Redis, redisLifecycle),
  Effect.provideService(DeprecatedLoggerEnv, loggerEnv),
  Effect.provideService(DeprecatedEnvVars, env),
  Effect.scoped,
  NodeRuntime.runMain,
)
