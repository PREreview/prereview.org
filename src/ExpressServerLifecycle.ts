import { Effect } from 'effect'
import * as L from 'logger-fp-ts'
import { DeprecatedLoggerEnv, Express } from './Context.js'

export const expressServerLifecycle = Effect.acquireRelease(
  Effect.gen(function* () {
    const app = yield* Express
    const loggerEnv = yield* DeprecatedLoggerEnv
    const listeningHttpServer = app.listen(3000)
    L.debug('Server listening')(loggerEnv)()
    return listeningHttpServer
  }),
  server =>
    Effect.gen(function* () {
      const loggerEnv = yield* DeprecatedLoggerEnv
      L.debug('Shutting server down')(loggerEnv)()
      server.close()
      return Effect.void
    }),
)
