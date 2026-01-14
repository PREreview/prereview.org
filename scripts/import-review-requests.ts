import { NodeRuntime } from '@effect/platform-node'
import { Effect, Logger, LogLevel, pipe } from 'effect'

const program = Effect.logDebug('Hello, world')

pipe(program, Logger.withMinimumLogLevel(LogLevel.Debug), NodeRuntime.runMain())
