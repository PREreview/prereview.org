import { FetchHttpClient } from '@effect/platform'
import { NodeHttpClient, NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { Config, Effect, Layer, Logger, LogLevel, pipe, Schema } from 'effect'
import { createServer } from 'http'
import fetch from 'make-fetch-happen'
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
import { verifyCache } from './VerifyCache.js'
import * as Zenodo from './Zenodo/index.js'

pipe(
  Program,
  Layer.merge(Layer.effectDiscard(verifyCache)),
  Layer.launch,
  Effect.provide(
    Layer.mergeAll(
      NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) }),
      Layer.effect(ExpressConfig, ExpressConfigLive),
      NodeHttpClient.layer,
      CachingHttpClient.layerPersistedToRedis,
      Layer.effect(
        FetchHttpClient.Fetch,
        Effect.gen(function* () {
          const publicUrl = yield* PublicUrl

          return fetch.defaults({
            cachePath: 'data/cache',
            headers: {
              'User-Agent': `PREreview (${publicUrl.href}; mailto:engineering@prereview.org)`,
            },
          }) as unknown as typeof globalThis.fetch
        }),
      ),
    ),
  ),
  Effect.provide(
    Layer.mergeAll(
      FeatureFlags.layerConfig({
        canChooseLocale: Config.withDefault(Config.boolean('CAN_CHOOSE_LOCALE'), false),
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
