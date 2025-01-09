import { Headers, HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from '@effect/platform'
import { NodeHttpClient, NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { Config, Effect, Function, Layer, Logger, LogLevel, Schema } from 'effect'
import { pipe } from 'fp-ts/lib/function.js'
import { createServer } from 'http'
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

const HttpClientLive = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return pipe(
      client,
      HttpClient.mapRequest(
        HttpClientRequest.setHeaders({
          'User-Agent': 'PREreview (https://prereview.org/; mailto:engineering@prereview.org)',
        }),
      ),
      HttpClient.tapRequest(request =>
        Effect.logDebug('Sending HTTP Request').pipe(
          Effect.annotateLogs({
            headers: Headers.redact(request.headers, 'authorization'),
            url: request.url,
            urlParams: UrlParams.toString(request.urlParams),
            method: request.method,
          }),
        ),
      ),
      HttpClient.tap(response =>
        Effect.logDebug('Received HTTP response').pipe(
          Effect.annotateLogs({
            status: response.status,
            headers: response.headers,
            url: response.request.url,
            urlParams: UrlParams.toString(response.request.urlParams),
            method: response.request.method,
          }),
        ),
      ),
      HttpClient.transformResponse(
        Effect.tapError(error =>
          Effect.logError('Error sending HTTP request').pipe(
            Effect.annotateLogs({
              reason: error.reason,
              error: error.cause,
              url: error.request.url,
              urlParams: UrlParams.toString(error.request.urlParams),
              method: error.request.method,
            }),
          ),
        ),
      ),
      HttpClient.transform((effect, request) =>
        pipe(
          Effect.succeed(HttpClientResponse.fromWeb(request, new Response())),
          Effect.tap(Effect.logDebug('Making request in background')),
          Effect.tap(() => effect),
        ),
      ),
    )
  }),
).pipe(Layer.provide(NodeHttpClient.layer))

pipe(
  Program,
  Layer.merge(Layer.effectDiscard(verifyCache)),
  Layer.launch,
  Effect.provide(
    Layer.mergeAll(
      NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) }),
      Layer.effect(ExpressConfig, ExpressConfigLive),
      HttpClientLive,
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
      Redis.layerConfig(Config.redacted(Config.url('REDIS_URI'))),
      TemplatePage.optionsLayerConfig({
        fathomId: Config.option(Config.string('FATHOM_SITE_ID')),
        environmentLabel: Config.option(Config.literal('dev', 'sandbox')('ENVIRONMENT_LABEL')),
      }),
      Layer.effect(PublicUrl, Config.url('PUBLIC_URL')),
      Layer.effect(SessionSecret, Config.redacted('SECRET')),
    ),
  ),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(Logger.replaceEffect(Logger.defaultLogger, DeprecatedLogger)),
  Effect.provideServiceEffect(DeprecatedLoggerEnv, makeDeprecatedLoggerEnv),
  Effect.provideServiceEffect(DeprecatedEnvVars, FptsToEffect.io(makeDeprecatedEnvVars)),
  Effect.scoped,
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
