import {
  Array,
  Cause,
  Config,
  DateTime,
  Effect,
  FiberId,
  Function,
  HashMap,
  Inspectable,
  List,
  Logger,
  LogLevel,
  Match,
  pipe,
  String,
} from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import type * as J from 'fp-ts/lib/Json.js'
import * as L from 'logger-fp-ts'
import { DeprecatedLoggerEnv } from './Context.ts'
import * as EffectToFpts from './EffectToFpts.ts'

export const makeDeprecatedLoggerEnv = Effect.gen(function* () {
  const logFormat = yield* Config.withDefault(Config.literal('json')('LOG_FORMAT'), 'pretty')

  return {
    clock: yield* EffectToFpts.makeIO(Effect.andThen(DateTime.now, DateTime.toDate)),
    logger: pipe(C.log, L.withShow(logFormat === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
  } satisfies typeof DeprecatedLoggerEnv.Service
})

export const DeprecatedLogger = Effect.gen(function* () {
  const loggerEnv = yield* DeprecatedLoggerEnv

  return Logger.make(options => {
    const message = pipe(Array.ensure(options.message), Array.map(Inspectable.toStringUnknown), Array.join(' '))
    const payload = Object.fromEntries(HashMap.toEntries(options.annotations)) as J.JsonRecord
    const spans = Object.fromEntries(
      List.map(options.spans, span => [span.label, options.date.getTime() - span.startTime]),
    )
    const cause = pipe(
      Match.value(options.cause),
      Match.tag('Empty', Function.constUndefined),
      Match.orElse(cause => Cause.pretty(cause, { renderErrorCause: true })),
    ) as J.Json

    return Match.value(options.logLevel).pipe(
      Match.tag('Fatal', () => L.errorP),
      Match.tag('Error', () => L.errorP),
      Match.tag('Warning', () => L.warnP),
      Match.tag('Info', () => L.infoP),
      Match.tag('Debug', () => L.debugP),
      Match.tag('Trace', () => L.debugP),
      Match.tag('All', () => L.debugP),
      Match.tag('None', () => L.debugP),
      Match.exhaustive,
    )(message)({ fiber: FiberId.threadName(options.fiberId), cause, ...payload, ...spans })(loggerEnv)()
  })
})

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
