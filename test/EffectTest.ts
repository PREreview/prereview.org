import { Effect, flow, Logger, LogLevel, TestContext, type Scope } from 'effect'

const effectTestBoilerplate = flow(
  Effect.scoped,
  Effect.provide(TestContext.TestContext),
  Logger.withMinimumLogLevel(LogLevel.None),
)

export const run = flow(effectTestBoilerplate<void, unknown, Scope.Scope>, Effect.runPromise)
