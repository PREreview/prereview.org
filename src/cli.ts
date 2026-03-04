import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Layer, pipe } from 'effect'
import { Cli } from './Cli/index.ts'
import * as EventDispatcher from './EventDispatcher.ts'
import * as Events from './Events.ts'
import * as ReviewRequest from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import * as SqlSensitiveDataStore from './SqlSensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

pipe(
  Cli(process.argv),
  Effect.provide(
    pipe(
      ReviewRequest.queriesLayer,
      Layer.provide(SqlEventStore.layer),
      Layer.provide([Events.layer, SqlSensitiveDataStore.layer, EventDispatcher.EventDispatcherLayer]),
      Layer.provide([
        Uuid.layer,
        PgClient.layerConfig({
          url: Config.redacted(Config.string('POSTGRES_URL')),
        }),
      ]),
      Layer.provideMerge(NodeContext.layer),
    ),
  ),
  NodeRuntime.runMain,
)
