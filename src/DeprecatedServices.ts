import { DateTime, Effect, LogLevel, Match, pipe, String } from 'effect'
import type * as L from 'logger-fp-ts'
import { EffectToFpts } from './RefactoringUtilities/index.ts'

const toLogLevel = pipe(
  Match.type<L.LogLevel>(),
  Match.withReturnType<LogLevel.LogLevel>(),
  Match.when('WARN', () => LogLevel.Warning),
  Match.orElse(level => LogLevel.fromLiteral(String.capitalize(String.toLowerCase(level)))),
)

export const MakeDeprecatedLoggerEnv = Effect.gen(function* () {
  const runtime = yield* Effect.runtime()
  const clock = yield* EffectToFpts.makeIO(Effect.andThen(DateTime.now, DateTime.toDate))

  return {
    clock,
    logger: EffectToFpts.toIOK(
      entry => pipe(Effect.logWithLevel(toLogLevel(entry.level), entry.message), Effect.annotateLogs(entry.payload)),
      runtime,
    ),
  } satisfies L.LoggerEnv
})
