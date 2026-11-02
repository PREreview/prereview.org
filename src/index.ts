import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai'
import { embeddingsLayer } from './Embeddings/index.ts'
import { ClusterWorkflowEngine, RunnerAddress } from 'effect/cluster'
import * as NodeSdk from '@effect/opentelemetry/NodeSdk'
import { NodeClusterSocket, NodeHttpClient, NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Temporal } from '@js-temporal/polyfill'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import {
  Array,
  Boolean,
  Config,
  Effect,
  flow,
  HashSet,
  Layer,
  Logger,
  Match,
  Option,
  pipe,
  Redacted,
  References,
  Schema,
} from 'effect'
import { createServer } from 'node:http'
import * as CachingHttpClient from './CachingHttpClient/index.ts'
import * as Clubs from './Clubs/index.ts'
import { AllowSiteCrawlers, EnabledLocales, ScietyListToken, SessionSecret } from './Context.ts'
import { ContentfulConfig, ContentfulId } from './ExternalApis/Contentful/index.ts'
import { Cloudinary, Ghost, Nodemailer, OpenAlex, Orcid, Slack, Zenodo } from './ExternalApis/index.ts'
import { CommunitySlack, LanguageDetection } from './ExternalInteractions/index.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import { html } from './html.ts'
import * as Keyv from './keyv.ts'
import { UserSelectableLocales } from './locales/index.ts'
import * as OrcidOauth from './OrcidOauth.ts'
import * as Prereviewers from './Prereviewers/index.ts'
import * as Prereviews from './Prereviews/index.ts'
import { Program } from './Program.ts'
import { PublicUrl } from './public-url.ts'
import * as Redis from './Redis.ts'
import * as SlackOauth from './SlackOauth.ts'
import { NonEmptyString, OrcidId } from './types/index.ts'
import { Name } from './types/Name.ts'
import { Slug } from './types/Slug.ts'
import { Uuid } from './types/Uuid.ts'
import { isPrereviewTeam, PrereviewTeam } from './user.ts'
import * as WebApp from './WebApp/index.ts'
import { IsUserBlocked } from './WebApp/log-in/index.ts'

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
    Keyv.keyvStoresLayer,
    Layer.provide(
      Layer.mergeAll(Prereviewers.CareerStages.layer, Prereviewers.Locations.layer),
      Redis.layerPersistenceFromDataStore,
    ),
    ClusterWorkflowEngine.layer,
  ]),
  Layer.provide(ClusterLayer),
  Layer.provide([
    Layer.effect(AllowSiteCrawlers, Config.withDefault(Config.Boolean('ALLOW_SITE_CRAWLERS'), false)),
    CommunitySlack.layerChannelIdsConfig({
      requestAReview: Config.schema(Slack.ChannelId, 'SLACK_REQUEST_REVIEW_CHANNEL_ID'),
      shareAReview: Config.schema(Slack.ChannelId, 'SLACK_SHARE_REVIEW_CHANNEL_ID'),
    }),
    CommunitySlack.layerShouldUpdateCommunitySlackConfig(Config.withDefault(Config.Boolean('SLACK_UPDATE'), false)),
    FeatureFlags.layerConfig({
      canAddMultipleAuthors: pipe(
        Config.withDefault(Config.Boolean('CAN_ADD_MULTIPLE_AUTHORS'), false),
        Config.map(canAddMultipleAuthors =>
          Effect.fnUntraced(function* (user) {
            const clubs = yield* Clubs.Clubs

            return (
              canAddMultipleAuthors &&
              (user ? isPrereviewTeam(user) || (yield* clubs.isPrereviewerAClubLead(user.orcid)) : false)
            )
          }),
        ),
      ),
      canClubLeadsAddReviewsToClubs: Config.withDefault(Config.Boolean('CAN_CLUB_LEADS_ADD_REVIEWS_TO_CLUBS'), false),
      canLogInAsDemoUser: Config.withDefault(Config.Boolean('CAN_LOG_IN_AS_DEMO_USER'), false),
      canPreviewContentFromContentful: Config.withDefault(Config.Boolean('CAN_PREVIEW_CONTENT_FROM_CONTENTFUL'), false),
      canUseMatchmaking: pipe(
        Config.Boolean('CAN_USE_MATCHMAKING'),
        Config.map(value => {
          return () => value
        }),
        Config.withDefault(() => false),
      ),
      loadBlogFromContentful: Config.withDefault(Config.Boolean('LOAD_BLOG_FROM_CONTENTFUL'), false),
      loadPagesFromContentful: Config.withDefault(Config.Boolean('LOAD_PAGES_FROM_CONTENTFUL'), false),
      sendCoarNotifyMessages: Config.withDefault(
        Config.Literals([true, false, 'sandbox'], 'SEND_COAR_NOTIFY_MESSAGES'),
        false,
      ),
      useCrowdinInContext: Config.withDefault(Config.Boolean('USE_CROWDIN_IN_CONTEXT'), false),
      showSpotlight: Config.withDefault(Config.Boolean('SHOW_SPOTLIGHT'), true),
    }),
    PostgresClientLayer,
    ContentfulConfig.layerConfig({
      accessToken: Config.Redacted('CONTENTFUL_ACCESS_TOKEN'),
      previewAccessToken: Config.Redacted('CONTENTFUL_PREVIEW_ACCESS_TOKEN'),
      environmentId: Config.succeed(ContentfulId.make('master')),
      spaceId: Config.withDefault(
        Config.schema(ContentfulId, 'CONTENTFUL_SPACE_ID'),
        ContentfulId.make('dapbmjoaf8gb'),
      ),
    }),
    Layer.effect(Ghost.GhostApi, Config.all({ key: Config.Redacted('GHOST_API_KEY') })),
    Layer.effect(
      Slack.SlackApi,
      Config.all({
        apiToken: Config.Redacted('SLACK_API_TOKEN'),
      }),
    ),
    Layer.effect(
      EnabledLocales,
      Config.withDefault(
        Config.Array(Schema.Literals([...UserSelectableLocales]), 'ENABLED_LOCALES').pipe(
          Config.map(HashSet.fromIterable),
        ),
        UserSelectableLocales,
      ),
    ),
    Layer.effect(
      Cloudinary.CloudinaryApi,
      Config.all({
        cloudName: Config.succeed('prereview'),
        key: Config.Redacted('CLOUDINARY_API_KEY'),
        secret: Config.Redacted('CLOUDINARY_API_SECRET'),
      }),
    ),
    Nodemailer.layerTransporterConfig(Config.URL('SMTP_URI').pipe(Config.map(Redacted.make))),
    Layer.effect(
      Orcid.OrcidApi,
      Config.all({
        origin: Config.withDefault(Config.URL('ORCID_API_URL'), new URL('https://pub.orcid.org/')),
        token: Config.option(Config.Redacted('ORCID_API_READ_PUBLIC_TOKEN')),
      }),
    ),
    OrcidOauth.layerConfig({
      url: Config.withDefault(Config.URL('ORCID_URL'), new URL('https://orcid.org/')),
      clientId: Config.String('ORCID_CLIENT_ID'),
      clientSecret: Config.Redacted('ORCID_CLIENT_SECRET'),
    }),
    SlackOauth.layerConfig({
      clientId: Config.String('SLACK_CLIENT_ID'),
      clientSecret: Config.Redacted('SLACK_CLIENT_SECRET'),
    }),
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
    WebApp.optionsLayerConfig({
      fathomId: Config.option(Config.String('FATHOM_SITE_ID')),
      environmentLabel: Config.option(Config.Literals(['dev', 'sandbox'], 'ENVIRONMENT_LABEL')),
    }),
    Layer.effect(
      IsUserBlocked,
      pipe(
        Config.withDefault(Config.Array(OrcidId.OrcidIdSchema, 'BLOCKED_USERS'), []),
        Config.map(blockedUsers => IsUserBlocked.of(user => Array.contains(blockedUsers, user))),
      ),
    ),
    Layer.effect(
      Prereviews.WasPrereviewRemoved,
      pipe(
        Config.withDefault(Config.Array(Schema.Int, 'REMOVED_PREREVIEWS'), []),
        Config.map(removedPrereviews => Prereviews.WasPrereviewRemoved.of(id => Array.contains(removedPrereviews, id))),
      ),
    ),
    Layer.effect(PublicUrl, Config.URL('PUBLIC_URL')),
    Layer.effect(
      ScietyListToken,
      Config.schema(NonEmptyString.NonEmptyStringSchema, 'SCIETY_LIST_TOKEN').pipe(Config.map(Redacted.make)),
    ),
    Layer.effect(SessionSecret, Config.Redacted('SECRET')),
    Layer.effect(
      Zenodo.ZenodoApi,
      Config.all({ key: Config.Redacted('ZENODO_API_KEY'), origin: Config.URL('ZENODO_URL') }),
    ),
    OpenAlex.layerApiConfig({ key: Config.Redacted('OPENALEX_API_KEY') }),
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
