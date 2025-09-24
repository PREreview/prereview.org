import { NodeHttpClient, NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Function, Layer, Logger, LogLevel, pipe, Schema } from 'effect'
import { createServer } from 'http'
import * as CachingHttpClient from './CachingHttpClient/index.ts'
import { isAClubLead } from './club-details.ts'
import { AllowSiteCrawlers, DeprecatedEnvVars, DeprecatedLoggerEnv, ExpressConfig, SessionSecret } from './Context.ts'
import { DeprecatedLogger, makeDeprecatedEnvVars, makeDeprecatedLoggerEnv } from './DeprecatedServices.ts'
import { ExpressConfigLive } from './ExpressServer.ts'
import { Cloudinary, Ghost, Orcid, Zenodo } from './ExternalApis/index.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import * as FptsToEffect from './FptsToEffect.ts'
import { LegacyPrereviewApi } from './legacy-prereview.ts'
import * as Nodemailer from './nodemailer.ts'
import * as OrcidOauth from './OrcidOauth.ts'
import * as PrereviewCoarNotify from './prereview-coar-notify/index.ts'
import { Program } from './Program.ts'
import { PublicUrl } from './public-url.ts'
import * as Redis from './Redis.ts'
import { SlackApiConfig } from './slack.ts'
import * as TemplatePage from './TemplatePage.ts'
import { isPrereviewTeam } from './user.ts'

const CockroachClientLayer = Layer.mergeAll(
  PgClient.layerConfig({
    url: Config.redacted(Config.string('COCKROACHDB_URL')),
    ssl: pipe(
      Config.url('COCKROACHDB_URL'),
      Config.map(url => url.searchParams.has('sslmode', 'verify-full')),
    ),
    onnotice: Config.succeed(Function.constVoid),
  }),
  Layer.effectDiscard(Effect.logDebug('Cockroach Database connected')),
  Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logDebug('Cockroach Database disconnected'))),
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
  CockroachClientLayer,
  Layer.orElse(() => LibsqlClientLayer),
)

pipe(
  Program,
  Layer.launch,
  Effect.provide(
    Layer.mergeAll(
      NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) }),
      Layer.effect(ExpressConfig, ExpressConfigLive),
      NodeHttpClient.layer,
      CachingHttpClient.layerPersistedToRedis,
    ),
  ),
  Effect.provide(
    Layer.mergeAll(
      Layer.effect(AllowSiteCrawlers, Config.withDefault(Config.boolean('ALLOW_SITE_CRAWLERS'), false)),
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
        useCrowdinInContext: Config.withDefault(Config.boolean('USE_CROWDIN_IN_CONTEXT'), false),
      }),
      SqlClient,
      Layer.effect(Ghost.GhostApi, Config.all({ key: Config.redacted('GHOST_API_KEY') })),
      Layer.effect(
        SlackApiConfig,
        Config.all({
          apiToken: Config.redacted('SLACK_API_TOKEN'),
          apiUpdate: Config.withDefault(Config.boolean('SLACK_UPDATE'), false),
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
          coarNotifyToken: Config.redacted('COAR_NOTIFY_TOKEN'),
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
      TemplatePage.optionsLayerConfig({
        fathomId: Config.option(Config.string('FATHOM_SITE_ID')),
        environmentLabel: Config.option(Config.literal('dev', 'sandbox')('ENVIRONMENT_LABEL')),
      }),
      Layer.effect(PublicUrl, Config.url('PUBLIC_URL')),
      Layer.effect(SessionSecret, Config.redacted('SECRET')),
      Layer.effect(
        Zenodo.ZenodoApi,
        Config.all({ key: Config.redacted('ZENODO_API_KEY'), origin: Config.url('ZENODO_URL') }),
      ),
    ),
  ),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(Logger.replaceEffect(Logger.defaultLogger, DeprecatedLogger)),
  Effect.provideServiceEffect(DeprecatedLoggerEnv, makeDeprecatedLoggerEnv),
  Effect.provideServiceEffect(DeprecatedEnvVars, FptsToEffect.io(makeDeprecatedEnvVars)),
  Effect.scoped,
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
