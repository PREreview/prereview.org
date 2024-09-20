import { FetchHttpClient } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
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

pipe(
  Program,
  Layer.merge(Layer.effectDiscard(verifyCache)),
  Layer.launch,
  Effect.provide(NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) })),
  Effect.provideServiceEffect(ExpressConfig, ExpressConfigLive),
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
