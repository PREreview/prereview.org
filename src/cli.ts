import { NodeContext, NodeHttpClient, NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Layer, pipe } from 'effect'
import { Cli } from './Cli/index.ts'
import * as ContactEmailAddresses from './ContactEmailAddresses/index.ts'
import * as EventDispatcher from './EventDispatcher.ts'
import * as Events from './Events.ts'
import { Crossref, Datacite, JapanLinkCenter, OpenAlex, Orcid, Philsci } from './ExternalApis/index.ts'
import { Email, LanguageDetection, OpenAlexWorks, OrcidRecords, PreprintData } from './ExternalInteractions/index.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import * as Keyv from './keyv.ts'
import * as LoggingHttpClient from './LoggingHttpClient.ts'
import * as Prereviewers from './Prereviewers/index.ts'
import * as Redis from './Redis.ts'
import * as ReviewRequest from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import * as SqlSensitiveDataStore from './SqlSensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

pipe(
  Cli(process.argv),
  Effect.provide(
    pipe(
      Layer.mergeAll(
        OpenAlexWorks.layer,
        PreprintData.layer,
        Prereviewers.layer,
        ReviewRequest.queriesLayer,
        ReviewRequest.commandsLayer,
      ),
      Layer.provideMerge(ContactEmailAddresses.layer),
      Layer.provide([
        LanguageDetection.layerCld,
        OrcidRecords.layer,
        Layer.mock(Email.Email, {}),
        Keyv.keyvStoresLayer,
      ]),
      Layer.provide([
        Crossref.layer,
        Datacite.layer,
        JapanLinkCenter.layer,
        OpenAlex.layer,
        Orcid.layer,
        Philsci.layer,
      ]),
      Layer.provideMerge(
        Layer.mergeAll(SqlEventStore.layer, Redis.layerDataStoreConfig(Config.redacted(Config.url('REDIS_URI')))),
      ),
      Layer.provide([Events.layer, SqlSensitiveDataStore.layer, LoggingHttpClient.layer]),
      Layer.provideMerge(EventDispatcher.EventDispatcherLayer),
      Layer.provide([
        FeatureFlags.layerDefaults,
        NodeHttpClient.layer,
        OpenAlex.layerApiConfig({ key: Config.redacted('OPENALEX_API_KEY') }),
        Layer.effect(
          Orcid.OrcidApi,
          Config.all({
            origin: Config.withDefault(Config.url('ORCID_API_URL'), new URL('https://pub.orcid.org/')),
            token: Config.option(Config.redacted('ORCID_API_READ_PUBLIC_TOKEN')),
          }),
        ),
        PgClient.layerConfig({
          url: Config.redacted(Config.string('POSTGRES_URL')),
        }),
      ]),
      Layer.provideMerge(Layer.mergeAll(NodeContext.layer, Uuid.layer)),
    ),
  ),
  NodeRuntime.runMain,
)
