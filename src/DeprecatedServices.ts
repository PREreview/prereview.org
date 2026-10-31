import { DateTime, Effect, type LogLevel, Match, pipe, String } from 'effect'
import type * as L from 'logger-fp-ts'
import { EffectToFpts } from './RefactoringUtilities/index.ts'

const toLogLevel = pipe(
  Match.type<L.LogLevel>(),
  Match.withReturnType<LogLevel.Severity>(),
  Match.when('WARN', () => 'Warn'),
  Match.orElse(level => String.capitalize(String.toLowerCase(level)) as LogLevel.Severity),
)

export const MakeDeprecatedLoggerEnv = Effect.gen(function* () {
  const runtime = yield* Effect.context()
  const clock = yield* EffectToFpts.makeIO(Effect.map(DateTime.now, DateTime.toDate))

  return {
    clock,
    logger: EffectToFpts.toIOK(
      entry => pipe(Effect.logWithLevel(toLogLevel(entry.level))(entry.message), Effect.annotateLogs(entry.payload)),
      runtime,
    ),
  } satisfies L.LoggerEnv
})
