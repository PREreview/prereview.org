import { PgClient } from '@effect/sql-pg'
import { Effect } from 'effect'

export default Effect.flatMap(PgClient.PgClient, sql =>
  Effect.gen(function* () {
    yield* sql`
      CREATE TABLE resources (
        id TEXT NOT NULL PRIMARY KEY,
        type TEXT NOT NULL,
        version INTEGER NOT NULL
      )
    `

    yield* sql`
      CREATE TABLE events (
        event_id TEXT NOT NULL PRIMARY KEY,
        resource_id TEXT NOT NULL,
        resource_version INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_timestamp TEXT NOT NULL,
        payload TEXT NOT NULL,
        FOREIGN KEY (resource_id) REFERENCES resources(id),
        UNIQUE (resource_id, resource_version)
      )
    `
  }),
)
