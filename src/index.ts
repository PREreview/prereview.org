import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Layer, Logger, LogLevel } from 'effect'
import { pipe } from 'fp-ts/lib/function.js'
import { createServer } from 'http'
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
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(Logger.replaceEffect(Logger.defaultLogger, DeprecatedLogger)),
  Effect.provideServiceEffect(DeprecatedLoggerEnv, makeDeprecatedLoggerEnv),
  Effect.provideService(DeprecatedEnvVars, makeDeprecatedEnvVars),
  Effect.scoped,
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
