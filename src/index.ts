import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai'
import { embeddingsLayer } from './Embeddings/index.ts'
import { ClusterWorkflowEngine, RunnerAddress } from 'effect/cluster'
import * as NodeSdk from '@effect/opentelemetry/NodeSdk'
import { NodeClusterSocket, NodeHttpClient, NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Temporal } from '@js-temporal/polyfill'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { Boolean, Config, Effect, flow, Layer, Logger, Match, Option, pipe, Redacted, References } from 'effect'
import { createServer } from 'node:http'
import * as AppConfig from './AppConfig.ts'
import * as AuthorInviteStore from './AuthorInviteStore.ts'
import * as CachingHttpClient from './CachingHttpClient/index.ts'
import * as Clubs from './Clubs/index.ts'
import { Nodemailer } from './ExternalApis/index.ts'
import { LanguageDetection } from './ExternalInteractions/index.ts'
import { html } from './html.ts'
import * as OrcidTokens from './OrcidTokens.ts'
import * as PreprintReviews from './PreprintReviews/index.ts'
import * as Prereviewers from './Prereviewers/index.ts'
import { Program } from './Program.ts'
import * as Redis from './Redis.ts'
import * as SessionStore from './SessionStore.ts'
import * as SlackUserIds from './SlackUserIds.ts'
import * as UserOnboardingStore from './UserOnboardingStore.ts'
import { Name } from './types/Name.ts'
import { Slug } from './types/Slug.ts'
import { Uuid } from './types/Uuid.ts'
import { PrereviewTeam } from './user.ts'

const PostgresClientLayer = Layer.mergeAll(
  PgClient.layerConfig({
    url: Config.Redacted('POSTGRES_URL'),
    acquireTimeout: Config.succeed('5 seconds'),
    keepAlive: Config.succeed('30 seconds'),
  }),
  Layer.effectDiscard(Effect.logDebug('Postgres Database connected')),
  Layer.effectDiscard(Effect.addFinalizer(() => Effect.logDebug('Postgres Database disconnected'))),
)

const ClusterLayer = Layer.unwrap(
  Effect.map(
    Effect.bind(
      Config.withDefault(
        Config.all({ runnerIp: Config.String('FLY_PRIVATE_IP'), listenHost: Config.succeed('fly-local-6pn') }),
        { runnerIp: 'localhost', listenHost: 'localhost' },
      ),
      'clientOnly',
      () => Config.withDefault(Config.Boolean('CLUSTER_CLIENT_ONLY'), false),
    ),
    ({ runnerIp, listenHost, clientOnly }) =>
      NodeClusterSocket.layer({
        clientOnly,
        shardingConfig: {
          runnerAddress: Option.some(RunnerAddress.make(runnerIp, 34431)),
          runnerListenAddress: Option.some(RunnerAddress.make(listenHost, 34431)),
          shardLockDisableAdvisory: true,
        },
      }),
  ),
)

const OpenTelemetry = Layer.unwrap(
  Effect.map(
    Config.withDefault(Config.Boolean('ENABLE_OPENTELEMETRY'), false),
    Boolean.match({
      onTrue: () =>
        NodeSdk.layer(() => ({
          resource: { serviceName: 'prereview' },
          spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
        })),
      onFalse: () => Layer.empty,
    }),
  ),
)

const ClubsData = Layer.unwrap(
  Effect.map(
    Config.withDefault(Config.Boolean('ADD_PREREVIEW_STAFF_CLUB'), false),
    Boolean.match({
      onTrue: () =>
        Layer.succeed(Clubs.ClubsData, [
          ...Clubs.DefaultClubs,
          {
            id: Uuid('df52ec81-2f3d-434a-99a4-c657ad1c2f41'),
            status: 'active',
            name: {
              language: 'en',
              text: Name('PREreview Staff Club'),
            },
            slug: Slug('prereview-staff'),
            description: {
              language: 'en',
              text: html` <p>A space for PREreview staff members to pretend they’re running a club.</p> `,
            },
            added: Temporal.PlainDate.from('2026-07-15'),
            leads: PrereviewTeam,
          },
        ]),
      onFalse: () => Clubs.layerDefaultClubs,
    }),
  ),
)

pipe(
  Program,
  Layer.provide(embeddingsLayer),
  Layer.provide(LanguageDetection.layerCld),
  Layer.provide(ClubsData),
  Layer.provide(OpenAiLanguageModel.model('gpt-5.6-sol')),
  Layer.provide(
    OpenAiClient.layerConfig({
      apiKey: Config.Redacted('OPENAI_API_KEY'),
      organizationId: Config.Redacted('OPENAI_ORGANIZATION').pipe(Config.withDefault(undefined)),
    }),
  ),
  Layer.provide([
    NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) }),
    NodeHttpClient.layerNodeHttp,
    CachingHttpClient.layerPersistedToRedis,
    Layer.provide(
      Layer.mergeAll(
        AuthorInviteStore.layer,
        SessionStore.layer,
        PreprintReviews.FormStore.layer,
        Prereviewers.CareerStages.layer,
        Prereviewers.IsOpenForRequestsStore.layer,
        Prereviewers.LanguagesStore.layer,
        Prereviewers.Locations.layer,
        Prereviewers.ResearchInterestsStore.layer,
        Prereviewers.Avatars.layer,
        OrcidTokens.layer,
        SlackUserIds.layer,
        UserOnboardingStore.layer,
      ),
      Redis.layerPersistenceFromDataStore,
    ),
    ClusterWorkflowEngine.layer,
  ]),
  Layer.provide(ClusterLayer),
  Layer.provide([
    AppConfig.layer,
    PostgresClientLayer,
    Nodemailer.layerTransporterConfig(Config.URL('SMTP_URI').pipe(Config.map(Redacted.make))),
    Redis.layerDataStoreConfig(Config.URL('REDIS_URI').pipe(Config.map(Redacted.make))),
    Redis.layerHttpCacheConfig(
      Config.all({
        primaryUri: Redis.httpCacheRedisUri.pipe(Config.map(Redacted.make)),
        readonlyFallbackUri: pipe(
          Config.URL('HTTP_CACHE_READONLY_FALLBACK_REDIS_URI'),
          Config.orElse(() => Redis.httpCacheRedisUri),
        ).pipe(Config.map(Redacted.make)),
      }),
    ),
  ]),
  Layer.provide(OpenTelemetry),
  Layer.provide(
    Logger.layer([
      Effect.map(
        Config.withDefault(Config.Literal('json', 'LOG_FORMAT'), 'pretty'),
        flow(
          Match.value,
          Match.when('json', () => Logger.consoleJson),
          Match.when('pretty', () => Logger.consolePretty()),
          Match.exhaustive,
        ),
      ),
      Logger.tracerLogger,
    ]),
  ),
  Layer.launch,
  Effect.provideService(References.MinimumLogLevel, 'Debug'),
  NodeRuntime.runMain,
)
