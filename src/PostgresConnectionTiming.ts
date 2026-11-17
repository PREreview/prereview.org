import { PgConnection } from '@effect/sql-pg'
import { Config, Duration, Effect, Layer, Schedule } from 'effect'

const timeOpeningAConnection = Effect.fn('PostgresConnectionTiming.timeOpeningAConnection')(
  function* () {
    const url = yield* Config.Redacted('POSTGRES_URL')

    const [connecting, connection] = yield* Effect.timed(PgConnection.make({ url }))
    const [firstQuery] = yield* Effect.timed(connection.query('SELECT 1'))
    const [secondQuery] = yield* Effect.timed(connection.query('SELECT 1'))

    yield* Effect.logInfo('Timed opening a Postgres connection').pipe(
      Effect.annotateLogs({
        connectingMs: Duration.toMillis(connecting),
        firstQueryMs: Duration.toMillis(firstQuery),
        secondQueryMs: Duration.toMillis(secondQuery),
      }),
    )
  },
  Effect.scoped,
  Effect.catch(error =>
    Effect.logWarning('Unable to time opening a Postgres connection').pipe(Effect.annotateLogs({ error })),
  ),
)

export const layer = Layer.effectDiscard(
  Effect.forkScoped(Effect.repeat(timeOpeningAConnection(), Schedule.spaced('5 minutes'))),
)
