import { NodeContext, NodeHttpClient, NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Layer, pipe } from 'effect'
import { Cli } from './Cli/index.ts'
import * as EventDispatcher from './EventDispatcher.ts'
import * as Events from './Events.ts'
import { Crossref, Datacite, JapanLinkCenter, OpenAlex, Philsci } from './ExternalApis/index.ts'
import { LanguageDetection, OpenAlexWorks, PreprintData } from './ExternalInteractions/index.ts'
import * as LoggingHttpClient from './LoggingHttpClient.ts'
import * as ReviewRequest from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import * as SqlSensitiveDataStore from './SqlSensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

pipe(
  Cli(process.argv),
  Effect.provide(
    pipe(
      Layer.mergeAll(OpenAlexWorks.layer, PreprintData.layer, ReviewRequest.queriesLayer, ReviewRequest.commandsLayer),
      Layer.provide(LanguageDetection.layerCld),
      Layer.provide([Crossref.layer, Datacite.layer, JapanLinkCenter.layer, OpenAlex.layer, Philsci.layer]),
      Layer.provide(SqlEventStore.layer),
      Layer.provide([
        Events.layer,
        SqlSensitiveDataStore.layer,
        EventDispatcher.EventDispatcherLayer,
        LoggingHttpClient.layer,
      ]),
      Layer.provide([
        NodeHttpClient.layer,
        OpenAlex.layerApiConfig({ key: Config.redacted('OPENALEX_API_KEY') }),
        PgClient.layerConfig({
          url: Config.redacted(Config.string('POSTGRES_URL')),
        }),
      ]),
      Layer.provideMerge(Layer.mergeAll(NodeContext.layer, Uuid.layer)),
    ),
  ),
  NodeRuntime.runMain,
)
