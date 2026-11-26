import { OpenRouterClient } from '@effect/ai-openrouter'
import { NodeClusterSocket, NodeHttpClient, NodeRuntime, NodeServices } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Array, Config, Effect, Layer, Option, pipe, Redacted, Schema } from 'effect'
import { ClusterWorkflowEngine, RunnerAddress } from 'effect/cluster'
import * as AuthorInviteStore from './AuthorInviteStore.ts'
import { Cli } from './Cli/index.ts'
import * as Clubs from './Domain/Clubs/index.ts'
import * as ContactEmailAddresses from './Domain/ContactEmailAddresses/index.ts'
import * as DatasetReviews from './Domain/DatasetReviews/index.ts'
import { SqlEventStore, StatefulQueries } from './Domain/Events/index.ts'
import * as PreprintReviews from './Domain/PreprintReviews/index.ts'
import * as Prereviewers from './Domain/Prereviewers/index.ts'
import * as ReviewRequest from './Domain/ReviewRequests/index.ts'
import { embeddingsLayer } from './Embeddings/index.ts'
import { SqlSensitiveDataStore } from './EventSourcing/index.ts'
import { Crossref, Datacite, JapanLinkCenter, OpenAlex, Orcid, Philsci, Zenodo } from './ExternalApis/index.ts'
import { Email, LanguageDetection, OpenAlexWorks, OrcidRecords, PreprintData } from './ExternalInteractions/index.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import * as LoggingHttpClient from './LoggingHttpClient.ts'
import * as LoggingWorkflowEngine from './LoggingWorkflowEngine.ts'
import * as Redis from './Redis.ts'
import { Uuid } from './types/index.ts'

const ClusterLayer = Layer.unwrap(
  Effect.map(
    Config.withDefault(
      Config.all({ runnerIp: Config.String('FLY_PRIVATE_IP'), listenHost: Config.succeed('fly-local-6pn') }),
      { runnerIp: 'localhost', listenHost: 'localhost' },
    ),
    ({ runnerIp, listenHost }) =>
      NodeClusterSocket.layer({
        clientOnly: true,
        shardingConfig: {
          runnerAddress: Option.some(RunnerAddress.make(runnerIp, 34431)),
          runnerListenAddress: Option.some(RunnerAddress.make(listenHost, 34431)),
          shardLockDisableAdvisory: true,
        },
      }),
  ),
)

pipe(
  Cli(process.argv.slice(2)),
  Effect.provide(
    pipe(
      Layer.effectDiscard(StatefulQueries.replay),
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
          Layer.provide(LoggingWorkflowEngine.layer, ClusterWorkflowEngine.layer),
        ),
      ),
      Layer.provide([ContactEmailAddresses.layer, ClusterLayer]),
      Layer.provideMerge(Clubs.layer),
      Layer.provide([
        Clubs.layerDefaultClubs,
        LanguageDetection.layerCld,
        OrcidRecords.layer,
        Layer.mock(Email.Email, {}),
        Layer.effect(
          PreprintReviews.WasPrereviewRemoved,
          pipe(
            Config.withDefault(Config.Array(Schema.Int, 'REMOVED_PREREVIEWS'), []),
            Config.map(removedPrereviews =>
              PreprintReviews.WasPrereviewRemoved.of(id => Array.contains(removedPrereviews, id)),
            ),
          ),
        ),
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
      Layer.provide([SqlSensitiveDataStore.layer, LoggingHttpClient.layer]),
      Layer.provideMerge(StatefulQueries.layer),
      Layer.provide([
        FeatureFlags.layerConfig({
          useEventsForPreprintReviews: Config.withDefault(Config.Boolean('USE_EVENTS_FOR_PREPRINT_REVIEWS'), false),
        }),
        NodeHttpClient.layerNodeHttp,
        OpenAlex.layerApiConfig({ key: Config.Redacted('OPENALEX_API_KEY') }),
        Layer.effect(
          Orcid.OrcidApi,
          Config.all({
            origin: Config.withDefault(Config.URL('ORCID_API_URL'), new URL('https://pub.orcid.org/')),
            token: Config.option(Config.Redacted('ORCID_API_READ_PUBLIC_TOKEN')),
          }),
        ),
        Layer.effect(
          Zenodo.ZenodoApi,
          Config.all({ key: Config.Redacted('ZENODO_API_KEY'), origin: Config.URL('ZENODO_URL') }),
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
