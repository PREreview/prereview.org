import { FetchHttpClient } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { Config, Effect, Layer, Logger, LogLevel } from 'effect'
import { pipe } from 'fp-ts/lib/function.js'
import { createServer } from 'http'
import fetch from 'make-fetch-happen'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, ExpressConfig, Redis } from './Context.js'
import { DeprecatedLogger, makeDeprecatedEnvVars, makeDeprecatedLoggerEnv } from './DeprecatedServices.js'
import { ExpressConfigLive } from './ExpressServer.js'
import { Program } from './Program.js'
import { redisLifecycle } from './Redis.js'
import { verifyCache } from './VerifyCache.js'
import { CanWriteFeedback } from './feature-flags.js'
import type { User } from './user.js'

const isPrereviewTeam = (user?: User) =>
  user
    ? [
        '0000-0001-8511-8689',
        '0000-0002-1472-1824',
        '0000-0002-3708-3546',
        '0000-0002-6109-0367',
        '0000-0002-6750-9341',
        '0000-0003-4921-6155',
        '0000-0002-5753-2556',
      ].includes(user.orcid)
    : false

pipe(
  Program,
  Layer.merge(Layer.effectDiscard(verifyCache)),
  Layer.launch,
  Effect.provideServiceEffect(
    CanWriteFeedback,
    Effect.gen(function* () {
      const canWriteFeedback = yield* Config.withDefault(Config.boolean('CAN_WRITE_FEEDBACK'), false)

      return user => canWriteFeedback && isPrereviewTeam(user)
    }),
  ),
  Effect.provide(NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) })),
  Effect.provideServiceEffect(ExpressConfig, ExpressConfigLive),
  Effect.provide(
    Layer.mergeAll(
      LibsqlClient.layerConfig({
        url: Config.string('LIBSQL_URL'),
        authToken: Config.withDefault(Config.string('LIBSQL_AUTH_TOKEN'), undefined),
      }),
      Layer.effectDiscard(Effect.logDebug('Database connected')),
      Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logDebug('Database disconnected'))),
    ),
  ),
  Effect.provideServiceEffect(Redis, redisLifecycle),
  Effect.provideServiceEffect(
    FetchHttpClient.Fetch,
    Effect.gen(function* () {
      const env = yield* DeprecatedEnvVars

      return fetch.defaults({
        cachePath: 'data/cache',
        headers: {
          'User-Agent': `PREreview (${env.PUBLIC_URL.href}; mailto:engineering@prereview.org)`,
        },
      }) as unknown as typeof globalThis.fetch
    }),
  ),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(Logger.replaceEffect(Logger.defaultLogger, DeprecatedLogger)),
  Effect.provideServiceEffect(DeprecatedLoggerEnv, makeDeprecatedLoggerEnv),
  Effect.provideServiceEffect(DeprecatedEnvVars, Effect.sync(makeDeprecatedEnvVars)),
  Effect.scoped,
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
