import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai'
import { ClusterWorkflowEngine, RunnerAddress } from '@effect/cluster'
import { NodeSdk } from '@effect/opentelemetry'
import { NodeClusterSocket, NodeHttpClient, NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { PgClient } from '@effect/sql-pg'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import {
  Array,
  Boolean,
  Config,
  Effect,
  flow,
  Function,
  Inspectable,
  Layer,
  Logger,
  LogLevel,
  Match,
  Option,
  pipe,
  Schema,
} from 'effect'
import { createServer } from 'http'
import * as CachingHttpClient from './CachingHttpClient/index.ts'
import { isAClubLead } from './Clubs/index.ts'
import { AllowSiteCrawlers, ScietyListToken, SessionSecret } from './Context.ts'
import { Cloudinary, Ghost, OpenAlex, Orcid, Slack, Zenodo } from './ExternalApis/index.ts'
import { CommunitySlack } from './ExternalInteractions/index.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import * as Keyv from './keyv.ts'
import { LegacyPrereviewApi } from './legacy-prereview.ts'
import * as Nodemailer from './nodemailer.ts'
import * as OrcidOauth from './OrcidOauth.ts'
import * as PrereviewCoarNotify from './prereview-coar-notify/index.ts'
import * as Prereviews from './Prereviews/index.ts'
import { Program } from './Program.ts'
import { PublicUrl } from './public-url.ts'
import * as Redis from './Redis.ts'
import * as SlackOauth from './SlackOauth.ts'
import { NonEmptyString, OrcidId } from './types/index.ts'
import { isPrereviewTeam } from './user.ts'
import * as WebApp from './WebApp/index.ts'
import { IsUserBlocked } from './WebApp/log-in/index.ts' // eslint-disable-line import/no-internal-modules

const PostgresClientLayer = Layer.mergeAll(
  PgClient.layerConfig({
    url: Config.redacted(Config.string('POSTGRES_URL')),
  }),
  Layer.effectDiscard(Effect.logDebug('Postgres Database connected')),
  Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logDebug('Postgres Database disconnected'))),
)

const LibsqlClientLayer = Layer.mergeAll(
  LibsqlClient.layerConfig({
    url: Schema.Config(
      'LIBSQL_URL',
      Schema.Union(Schema.TemplateLiteral('file:', Schema.String), Schema.Literal(':memory:'), Schema.URL),
    ),
    authToken: Config.withDefault(Config.redacted('LIBSQL_AUTH_TOKEN'), undefined),
  }),
  Layer.effectDiscard(Effect.logDebug('Libsql Database connected')),
  Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logDebug('Libsql Database disconnected'))),
)

const SqlClient = pipe(
  PostgresClientLayer,
  Layer.orElse(() => LibsqlClientLayer),
)

const ClusterLayer = Layer.unwrapEffect(
  Effect.andThen(
    Config.withDefault(
      Config.all({ runnerIp: Config.string('FLY_PRIVATE_IP'), listenHost: Config.succeed('fly-local-6pn') }),
      { runnerIp: 'localhost', listenHost: 'localhost' },
    ),
    ({ runnerIp, listenHost }) =>
      NodeClusterSocket.layer({
        shardingConfig: {
          runnerAddress: Option.some(RunnerAddress.make(runnerIp, 34431)),
          runnerListenAddress: Option.some(RunnerAddress.make(listenHost, 34431)),
        },
      }),
  ),
)

const OpenTelemetry = Layer.unwrapEffect(
  Effect.andThen(
    Config.withDefault(Config.boolean('ENABLE_OPENTELEMETRY'), false),
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

pipe(
  Program,
  Layer.provide(OpenAiLanguageModel.modelWithTokenizer('gpt-4o')),
  Layer.provide(
    OpenAiClient.layerConfig({
      apiKey: Config.redacted('OPENAI_API_KEY'),
      organizationId: Config.redacted('OPENAI_ORGANIZATION').pipe(Config.withDefault(undefined)),
    }),
  ),
  Layer.provide(
    Layer.mergeAll(
      NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) }),
      NodeHttpClient.layer,
      CachingHttpClient.layerPersistedToRedis,
      Keyv.keyvStoresLayer,
      ClusterWorkflowEngine.layer,
    ),
  ),
  Layer.provide(ClusterLayer),
  Layer.provide(
    Layer.mergeAll(
      Layer.effect(AllowSiteCrawlers, Config.withDefault(Config.boolean('ALLOW_SITE_CRAWLERS'), false)),
      CommunitySlack.layerChannelIdsConfig({
        requestAReview: Schema.Config('SLACK_REQUEST_REVIEW_CHANNEL_ID', Slack.ChannelId),
        shareAReview: Schema.Config('SLACK_SHARE_REVIEW_CHANNEL_ID', Slack.ChannelId),
      }),
      CommunitySlack.layerShouldUpdateCommunitySlackConfig(Config.withDefault(Config.boolean('SLACK_UPDATE'), false)),
      FeatureFlags.layerConfig({
        aiReviewsAsCc0: pipe(
          Config.withDefault(Config.boolean('AI_REVIEWS_AS_CC0'), false),
          Config.map(Function.constant),
        ),
        askAiReviewEarly: pipe(
          Config.withDefault(Config.boolean('ASK_AI_REVIEW_EARLY'), false),
          Config.map(Function.constant),
        ),
        canAddMultipleAuthors: pipe(
          Config.withDefault(Config.boolean('CAN_ADD_MULTIPLE_AUTHORS'), false),
          Config.map(
            canAddMultipleAuthors => user =>
              canAddMultipleAuthors && (user ? isPrereviewTeam(user) || isAClubLead(user.orcid) : false),
          ),
        ),
        canLogInAsDemoUser: Config.withDefault(Config.boolean('CAN_LOG_IN_AS_DEMO_USER'), false),
        canReviewDatasets: Config.withDefault(Config.boolean('CAN_REVIEW_DATASETS'), false),
        canSubscribeToReviewRequests: Config.withDefault(Config.boolean('CAN_SUBSCRIBE_TO_REVIEW_REQUESTS'), false),
        enableCoarNotifyInbox: Config.withDefault(Config.boolean('ENABLE_COAR_NOTIFY_INBOX'), false),
        sendCoarNotifyMessages: Config.withDefault(
          Config.literal(true, false, 'sandbox')('SEND_COAR_NOTIFY_MESSAGES'),
          false,
        ),
        useCrowdinInContext: Config.withDefault(Config.boolean('USE_CROWDIN_IN_CONTEXT'), false),
      }),
      SqlClient,
      Layer.effect(Ghost.GhostApi, Config.all({ key: Config.redacted('GHOST_API_KEY') })),
      Layer.effect(
        Slack.SlackApi,
        Config.all({
          apiToken: Config.redacted('SLACK_API_TOKEN'),
        }),
      ),
      Layer.effect(
        Cloudinary.CloudinaryApi,
        Config.all({
          cloudName: Config.succeed('prereview'),
          key: Config.redacted('CLOUDINARY_API_KEY'),
          secret: Config.redacted('CLOUDINARY_API_SECRET'),
        }),
      ),
      Layer.effect(
        PrereviewCoarNotify.PrereviewCoarNotifyConfig,
        Config.all({
          coarNotifyUrl: Config.url('COAR_NOTIFY_URL'),
        }),
      ),
      Layer.effect(
        LegacyPrereviewApi,
        Config.all({
          app: Config.string('LEGACY_PREREVIEW_API_APP'),
          key: Config.redacted('LEGACY_PREREVIEW_API_KEY'),
          origin: Config.url('LEGACY_PREREVIEW_URL'),
          update: Config.withDefault(Config.boolean('LEGACY_PREREVIEW_UPDATE'), false),
        }),
      ),
      Nodemailer.layerConfig(Config.redacted(Config.url('SMTP_URI'))),
      Layer.effect(
        Orcid.OrcidApi,
        Config.all({
          origin: Config.withDefault(Config.url('ORCID_API_URL'), new URL('https://pub.orcid.org/')),
          token: Config.option(Config.redacted('ORCID_API_READ_PUBLIC_TOKEN')),
        }),
      ),
      OrcidOauth.layerConfig({
        url: Config.withDefault(Config.url('ORCID_URL'), new URL('https://orcid.org/')),
        clientId: Config.string('ORCID_CLIENT_ID'),
        clientSecret: Config.redacted('ORCID_CLIENT_SECRET'),
      }),
      SlackOauth.layerConfig({
        clientId: Config.string('SLACK_CLIENT_ID'),
        clientSecret: Config.redacted('SLACK_CLIENT_SECRET'),
      }),
      Redis.layerDataStoreConfig(Config.redacted(Config.url('REDIS_URI'))),
      Redis.layerHttpCacheConfig(
        Config.all({
          primaryUri: Config.redacted(Redis.httpCacheRedisUri),
          readonlyFallbackUri: Config.redacted(
            pipe(
              Config.url('HTTP_CACHE_READONLY_FALLBACK_REDIS_URI'),
              Config.orElse(() => Redis.httpCacheRedisUri),
            ),
          ),
        }),
      ),
      WebApp.optionsLayerConfig({
        fathomId: Config.option(Config.string('FATHOM_SITE_ID')),
        environmentLabel: Config.option(Config.literal('dev', 'sandbox')('ENVIRONMENT_LABEL')),
      }),
      Layer.effect(
        IsUserBlocked,
        pipe(
          Config.withDefault(Config.array(Schema.Config('BLOCKED_USERS', OrcidId.OrcidIdSchema)), []),
          Config.map(blockedUsers => IsUserBlocked.of(user => Array.contains(blockedUsers, user))),
        ),
      ),
      Layer.effect(
        Prereviews.WasPrereviewRemoved,
        pipe(
          Config.withDefault(Config.array(Config.integer(), 'REMOVED_PREREVIEWS'), []),
          Config.map(removedPrereviews =>
            Prereviews.WasPrereviewRemoved.of(id => Array.contains(removedPrereviews, id)),
          ),
        ),
      ),
      Layer.effect(PublicUrl, Config.url('PUBLIC_URL')),
      Layer.effect(
        ScietyListToken,
        Config.redacted(Schema.Config('SCIETY_LIST_TOKEN', NonEmptyString.NonEmptyStringSchema)),
      ),
      Layer.effect(SessionSecret, Config.redacted('SECRET')),
      Layer.effect(
        Zenodo.ZenodoApi,
        Config.all({ key: Config.redacted('ZENODO_API_KEY'), origin: Config.url('ZENODO_URL') }),
      ),
      OpenAlex.layerApiConfig({ key: Config.redacted('OPENALEX_API_KEY') }),
    ),
  ),
  Layer.provide(OpenTelemetry),
  Layer.provide(
    Logger.replaceEffect(
      Logger.defaultLogger,
      Effect.andThen(
        Config.withDefault(Config.literal('json')('LOG_FORMAT'), 'pretty'),
        flow(
          Match.value,
          Match.when('json', () =>
            Logger.structuredLogger.pipe(
              Logger.map(({ logLevel, ...logEntry }) => ({ level: logLevel, ...logEntry })),
              Logger.map(Inspectable.stringifyCircular),
              Logger.withConsoleLog,
            ),
          ),
          Match.when('pretty', () => Logger.prettyLoggerDefault),
          Match.exhaustive,
        ),
      ),
    ),
  ),
  Layer.launch,
  Effect.scoped,
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
