import { NodeRuntime } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { pipe } from 'fp-ts/lib/function.js'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, Express, Redis } from './Context.js'
import { makeDeprecatedEnvVars, makeDeprecatedLoggerEnv } from './DeprecatedServices.js'
import { expressServer } from './ExpressServer.js'
import { expressServerLifecycle } from './ExpressServerLifecycle.js'
import { mitigateZenodoSandboxIpv6Issue } from './MitigateZenodoSandboxIpv6Issue.js'
import { redisLifecycle } from './Redis.js'
import { verifyCache } from './VerifyCache.js'

pipe(
  mitigateZenodoSandboxIpv6Issue,
  Effect.andThen(expressServerLifecycle),
  Effect.tap(verifyCache),
  Layer.scopedDiscard,
  Layer.launch,
  Effect.provideServiceEffect(Express, expressServer),
  Effect.provideServiceEffect(Redis, redisLifecycle),
  Effect.provideServiceEffect(DeprecatedLoggerEnv, makeDeprecatedLoggerEnv),
  Effect.provideService(DeprecatedEnvVars, makeDeprecatedEnvVars),
  Effect.scoped,
  NodeRuntime.runMain,
)
