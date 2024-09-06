import { SystemClock } from 'clock-ts'
import { Effect } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as L from 'logger-fp-ts'
import { DeprecatedEnvVars } from './Context.js'
import { decodeEnv } from './env.js'

export const makeDeprecatedEnvVars = decodeEnv(process)()

export const makeDeprecatedLoggerEnv = Effect.gen(function* () {
  const env = yield* DeprecatedEnvVars
  return {
    clock: SystemClock,
    logger: pipe(C.log, L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
  }
})
