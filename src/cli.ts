import { NodeServices, NodeHttpClient, NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Layer, pipe, Redacted } from 'effect'
import * as AuthorInviteStore from './AuthorInviteStore.ts'
import { Cli } from './Cli/index.ts'
import * as Clubs from './Clubs/index.ts'
import * as PreprintReviews from './PreprintReviews/index.ts'
import * as ContactEmailAddresses from './ContactEmailAddresses/index.ts'
import * as DatasetReviews from './DatasetReviews/index.ts'
import * as EventDispatcher from './EventDispatcher.ts'
import * as Events from './Events.ts'
import { Crossref, Datacite, JapanLinkCenter, OpenAlex, Orcid, Philsci } from './ExternalApis/index.ts'
import { Email, LanguageDetection, OpenAlexWorks, OrcidRecords, PreprintData } from './ExternalInteractions/index.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import * as LoggingHttpClient from './LoggingHttpClient.ts'
import * as Prereviewers from './Prereviewers/index.ts'
import * as Redis from './Redis.ts'
import * as ReviewRequest from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import * as SqlSensitiveDataStore from './SqlSensitiveDataStore.ts'
import { Uuid } from './types/index.ts'
import { embeddingsLayer } from './Embeddings/index.ts'
import { OpenRouterClient } from '@effect/ai-openrouter'

pipe(
  Cli(process.argv.slice(2)),
  Effect.provide(
    pipe(
      Layer.effectDiscard(EventDispatcher.replayExistingEvents),
      Layer.provideMerge(PreprintReviews.layer),
      Layer.provideMerge(
        Layer.mergeAll(
          DatasetReviews.commandsLayer,
          OpenAlexWorks.layer,
          PreprintData.layer,
          Prereviewers.layer,
          ReviewRequest.queriesLayer,
          ReviewRequest.commandsLayer,
          embeddingsLayer,
        ),
      ),
      Layer.provide(ContactEmailAddresses.layer),
      Layer.provideMerge(Clubs.layer),
      Layer.provide([
        Clubs.layerDefaultClubs,
        LanguageDetection.layerCld,
        OrcidRecords.layer,
        Layer.mock(Email.Email, {}),
        Layer.provide(
          Layer.mergeAll(AuthorInviteStore.layer, PreprintReviews.FormStore.layer),
          Redis.layerPersistenceFromDataStore,
        ),
      ]),
      Layer.provide([
        Crossref.layer,
        Datacite.layer,
        JapanLinkCenter.layer,
        OpenAlex.layer,
        Orcid.layer,
        Philsci.layer,
        OpenRouterClient.layerConfig({ apiKey: Config.Redacted('OPENROUTER_API_KEY') }),
      ]),
      Layer.provideMerge(
        Layer.mergeAll(
          SqlEventStore.layer,
          Redis.layerDataStoreConfig(Config.URL('REDIS_URI').pipe(Config.map(Redacted.make))),
        ),
      ),
      Layer.provide([Events.layer, SqlSensitiveDataStore.layer, LoggingHttpClient.layer]),
      Layer.provideMerge(EventDispatcher.EventDispatcherLayer),
      Layer.provide([
        FeatureFlags.layerDefaults,
        NodeHttpClient.layerNodeHttp,
        OpenAlex.layerApiConfig({ key: Config.Redacted('OPENALEX_API_KEY') }),
        Layer.effect(
          Orcid.OrcidApi,
          Config.all({
            origin: Config.withDefault(Config.URL('ORCID_API_URL'), new URL('https://pub.orcid.org/')),
            token: Config.option(Config.Redacted('ORCID_API_READ_PUBLIC_TOKEN')),
          }),
        ),
        PgClient.layerConfig({
          url: Config.Redacted('POSTGRES_URL'),
          acquireTimeout: Config.succeed('5 seconds'),
          keepAlive: Config.succeed('30 seconds'),
        }),
      ]),
      Layer.provideMerge(Layer.mergeAll(NodeServices.layer, Uuid.layer)),
    ),
  ),
  NodeRuntime.runMain,
)
