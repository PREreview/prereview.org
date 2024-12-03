import { SystemClock } from 'clock-ts'
import { Array, Effect, HashMap, Inspectable, List, Logger, Match, Runtime } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import { pipe } from 'fp-ts/lib/function.js'
import type * as J from 'fp-ts/lib/Json.js'
import * as L from 'logger-fp-ts'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, type DeprecatedSleepEnv } from './Context.js'
import { decodeEnv } from './env.js'

export const makeDeprecatedEnvVars = decodeEnv(process)

export const makeDeprecatedLoggerEnv = Effect.gen(function* () {
  const env = yield* DeprecatedEnvVars
  return {
    clock: SystemClock,
    logger: pipe(C.log, L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
  }
})

export const makeDeprecatedSleepEnv = Effect.gen(function* () {
  const runtime = yield* Effect.runtime()

  return {
    sleep: (duration: number) => () => Runtime.runPromise(runtime)(Effect.sleep(`${duration} millis`)),
  } satisfies typeof DeprecatedSleepEnv.Service
})

export const DeprecatedLogger = Effect.gen(function* () {
  const loggerEnv = yield* DeprecatedLoggerEnv

  return Logger.make(options => {
    const message = pipe(Array.ensure(options.message), Array.map(Inspectable.toStringUnknown), Array.join(' '))
    const payload = Object.fromEntries(HashMap.toEntries(options.annotations)) as J.JsonRecord
    const spans = Object.fromEntries(
      List.map(options.spans, span => [span.label, options.date.getTime() - span.startTime]),
    )

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
    )(message)({ ...payload, ...spans })(loggerEnv)()
  })
})
