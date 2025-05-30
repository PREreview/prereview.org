import { NodeHttpClient, NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { Config, Effect, Layer, Logger, LogLevel, pipe, Schema } from 'effect'
import { createServer } from 'http'
import * as CachingHttpClient from './CachingHttpClient/index.js'
import { CloudinaryApiConfig } from './cloudinary.js'
import { isAClubLead } from './club-details.js'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, ExpressConfig, SessionSecret } from './Context.js'
import { DeprecatedLogger, makeDeprecatedEnvVars, makeDeprecatedLoggerEnv } from './DeprecatedServices.js'
import { ExpressConfigLive } from './ExpressServer.js'
import * as FeatureFlags from './FeatureFlags.js'
import * as FptsToEffect from './FptsToEffect.js'
import { GhostApi } from './GhostPage.js'
import * as Nodemailer from './nodemailer.js'
import * as OrcidOauth from './OrcidOauth.js'
import * as PrereviewCoarNotify from './prereview-coar-notify/index.js'
import { Program } from './Program.js'
import { PublicUrl } from './public-url.js'
import * as Redis from './Redis.js'
import { SlackApiConfig } from './slack.js'
import * as TemplatePage from './TemplatePage.js'
import { isPrereviewTeam } from './user.js'
import * as Zenodo from './Zenodo/index.js'

const httpCacheRedisUri = Config.url('HTTP_CACHE_REDIS_URI').pipe(
  Config.orElse(() =>
    Config.all({
      uriTemplate: Config.string('HTTP_CACHE_REDIS_URI_TEMPLATE'),
      region: Config.nonEmptyString('FLY_REGION'),
    }).pipe(Config.map(({ uriTemplate, region }) => new URL(uriTemplate.replace('{region}', region)))),
  ),
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
      FeatureFlags.layerConfig({
        canAddMultipleAuthors: pipe(
          Config.withDefault(Config.boolean('CAN_ADD_MULTIPLE_AUTHORS'), false),
          Config.map(
            canAddMultipleAuthors => user =>
              canAddMultipleAuthors && (user ? isPrereviewTeam(user) || isAClubLead(user.orcid) : false),
          ),
        ),
        canChooseLocale: Config.withDefault(Config.boolean('CAN_CHOOSE_LOCALE'), false),
        canSeeDesignTweaks: Config.withDefault(Config.boolean('CAN_SEE_DESIGN_TWEAKS'), false),
        useCrowdinInContext: Config.withDefault(Config.boolean('USE_CROWDIN_IN_CONTEXT'), false),
      }),
      Layer.mergeAll(
        LibsqlClient.layerConfig({
          url: Schema.Config(
            'LIBSQL_URL',
            Schema.Union(Schema.TemplateLiteral('file:', Schema.String), Schema.Literal(':memory:'), Schema.URL),
          ),
          authToken: Config.withDefault(Config.redacted('LIBSQL_AUTH_TOKEN'), undefined),
        }),
        Layer.effectDiscard(Effect.logDebug('Database connected')),
        Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logDebug('Database disconnected'))),
      ),
      Layer.effect(GhostApi, Config.all({ key: Config.redacted('GHOST_API_KEY') })),
      Layer.effect(SlackApiConfig, Config.all({ apiToken: Config.redacted('SLACK_API_TOKEN') })),
      Layer.effect(
        CloudinaryApiConfig,
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
      Nodemailer.layerConfig(Config.redacted(Config.url('SMTP_URI'))),
      OrcidOauth.layerConfig({
        url: Config.withDefault(Config.url('ORCID_URL'), new URL('https://orcid.org/')),
        clientId: Config.string('ORCID_CLIENT_ID'),
        clientSecret: Config.redacted('ORCID_CLIENT_SECRET'),
      }),
      Redis.layerDataStoreConfig(Config.redacted(Config.url('REDIS_URI'))),
      Redis.layerHttpCacheConfig(Config.redacted(httpCacheRedisUri)),
      TemplatePage.optionsLayerConfig({
        fathomId: Config.option(Config.string('FATHOM_SITE_ID')),
        environmentLabel: Config.option(Config.literal('dev', 'sandbox')('ENVIRONMENT_LABEL')),
      }),
      Layer.effect(PublicUrl, Config.url('PUBLIC_URL')),
      Layer.effect(SessionSecret, Config.redacted('SECRET')),
      Layer.effect(Zenodo.ZenodoOrigin, Config.url('ZENODO_URL')),
    ),
  ),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(Logger.replaceEffect(Logger.defaultLogger, DeprecatedLogger)),
  Effect.provideServiceEffect(DeprecatedLoggerEnv, makeDeprecatedLoggerEnv),
  Effect.provideServiceEffect(DeprecatedEnvVars, FptsToEffect.io(makeDeprecatedEnvVars)),
  Effect.scoped,
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
