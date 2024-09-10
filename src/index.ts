import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Layer } from 'effect'
import { pipe } from 'fp-ts/lib/function.js'
import { createServer } from 'http'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, ExpressConfig, Redis } from './Context.js'
import { makeDeprecatedEnvVars, makeDeprecatedLoggerEnv } from './DeprecatedServices.js'
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
  Effect.provideServiceEffect(DeprecatedLoggerEnv, makeDeprecatedLoggerEnv),
  Effect.provideService(DeprecatedEnvVars, makeDeprecatedEnvVars),
  Effect.scoped,
  NodeRuntime.runMain,
)
