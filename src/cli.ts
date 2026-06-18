import { NodeContext, NodeHttpClient, NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Layer, pipe } from 'effect'
import { Cli } from './Cli/index.ts'
import { ContactEmailAddressIsUnavailable, GetContactEmailAddress } from './contact-email-address.ts'
import { ContactEmailAddresses } from './ContactEmailAddresses/index.ts'
import * as EventDispatcher from './EventDispatcher.ts'
import * as Events from './Events.ts'
import { Crossref, Datacite, JapanLinkCenter, OpenAlex, Orcid, Philsci } from './ExternalApis/index.ts'
import { LanguageDetection, OpenAlexWorks, OrcidRecords, PreprintData } from './ExternalInteractions/index.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import * as LoggingHttpClient from './LoggingHttpClient.ts'
import * as Prereviewers from './Prereviewers/index.ts'
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
      Layer.provide([
        LanguageDetection.layerCld,
        OrcidRecords.layer,
        Layer.succeed(GetContactEmailAddress, () => new ContactEmailAddressIsUnavailable({ cause: 'not implemented' })),
        Layer.mock(ContactEmailAddresses, {}),
      ]),
      Layer.provide([
        Crossref.layer,
        Datacite.layer,
        JapanLinkCenter.layer,
        OpenAlex.layer,
        Orcid.layer,
        Philsci.layer,
      ]),
      Layer.provideMerge(SqlEventStore.layer),
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
