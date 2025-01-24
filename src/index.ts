import { NodeHttpClient, NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { Config, Effect, Function, Layer, Logger, LogLevel, Schema } from 'effect'
import { pipe } from 'fp-ts/lib/function.js'
import { createServer } from 'http'
import * as CachingHttpClient from './CachingHttpClient/index.js'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, ExpressConfig, SessionSecret } from './Context.js'
import { DeprecatedLogger, makeDeprecatedEnvVars, makeDeprecatedLoggerEnv } from './DeprecatedServices.js'
import { ExpressConfigLive } from './ExpressServer.js'
import * as FeatureFlags from './feature-flags.js'
import * as FptsToEffect from './FptsToEffect.js'
import { GhostApi } from './ghost.js'
import * as Nodemailer from './nodemailer.js'
import { Program } from './Program.js'
import { PublicUrl } from './public-url.js'
import * as Redis from './Redis.js'
import * as TemplatePage from './TemplatePage.js'

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
        canChooseLocale: Config.withDefault(Config.boolean('CAN_CHOOSE_LOCALE'), false),
        canWriteComments: Config.map(
          Config.withDefault(Config.boolean('CAN_WRITE_COMMENTS'), false),
          Function.constant,
        ),
        requiresAVerifiedEmailAddress: Config.withDefault(Config.boolean('REQUIRES_A_VERIFIED_EMAIL_ADDRESS'), false),
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
      Nodemailer.layerConfig(Config.redacted(Config.url('SMTP_URI'))),
      Redis.layerDataStoreConfig(Config.redacted(Config.url('REDIS_URI'))),
      Redis.layerHttpCacheConfig(Config.redacted(Config.url('HTTP_CACHE_REDIS_URI'))),
      TemplatePage.optionsLayerConfig({
        fathomId: Config.option(Config.string('FATHOM_SITE_ID')),
        environmentLabel: Config.option(Config.literal('dev', 'sandbox')('ENVIRONMENT_LABEL')),
      }),
      Layer.effect(PublicUrl, Config.url('PUBLIC_URL')),
      Layer.effect(SessionSecret, Config.redacted('SECRET')),
    ),
  ),
  Effect.withTracerEnabled(false),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(Logger.replaceEffect(Logger.defaultLogger, DeprecatedLogger)),
  Effect.provideServiceEffect(DeprecatedLoggerEnv, makeDeprecatedLoggerEnv),
  Effect.provideServiceEffect(DeprecatedEnvVars, FptsToEffect.io(makeDeprecatedEnvVars)),
  Effect.scoped,
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
