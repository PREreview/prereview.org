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
  Match,
  pipe,
} from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import type * as J from 'fp-ts/lib/Json.js'
import * as L from 'logger-fp-ts'
import * as l from 'logging-ts/lib/IO.js'
import { DeprecatedLoggerEnv } from './Context.ts'
import * as EffectToFpts from './EffectToFpts.ts'
import { decodeEnv } from './env.ts'

export const makeDeprecatedEnvVars = decodeEnv(process)

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

export const AddAnnotationsToLogger = Effect.fn(function* (logger: L.Logger) {
  const logAnnotations = yield* Effect.logAnnotations

  return pipe(
    logger,
    l.contramap((entry: L.LogEntry) => ({
      ...entry,
      payload: { ...(Object.fromEntries(HashMap.toEntries(logAnnotations)) as J.JsonRecord), ...entry.payload },
    })),
  )
})
