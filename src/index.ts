import { NodeRuntime } from '@effect/platform-node'
import { SystemClock } from 'clock-ts'
import { Effect, Layer } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as L from 'logger-fp-ts'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, Express, Redis } from './Context.js'
import { decodeEnv } from './env.js'
import { expressServer } from './ExpressServer.js'
import { expressServerLifecycle } from './ExpressServerLifecycle.js'
import { mitigateZenodoSandboxIpv6Issue } from './MitigateZenodoSandboxIpv6Issue.js'
import { redisLifecycle } from './Redis.js'
import { verifyCache } from './VerifyCache.js'

const localEnv = decodeEnv(process)()

const localLoggerEnv: L.LoggerEnv = {
  clock: SystemClock,
  logger: pipe(
    C.log,
    L.withShow(localEnv.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry)),
  ),
}

pipe(
  mitigateZenodoSandboxIpv6Issue,
  Effect.andThen(expressServerLifecycle),
  Effect.tap(verifyCache),
  Layer.scopedDiscard,
  Layer.launch,
  Effect.provideServiceEffect(Express, expressServer),
  Effect.provideServiceEffect(Redis, redisLifecycle),
  Effect.provideService(DeprecatedLoggerEnv, localLoggerEnv),
  Effect.provideService(DeprecatedEnvVars, localEnv),
  Effect.scoped,
  NodeRuntime.runMain,
)
