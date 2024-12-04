import { FetchHttpClient } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { Config, Effect, Layer, Logger, LogLevel } from 'effect'
import { pipe } from 'fp-ts/lib/function.js'
import { createServer } from 'http'
import fetch from 'make-fetch-happen'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, ExpressConfig } from './Context.js'
import { DeprecatedLogger, makeDeprecatedEnvVars, makeDeprecatedLoggerEnv } from './DeprecatedServices.js'
import { ExpressConfigLive } from './ExpressServer.js'
import * as FptsToEffect from './FptsToEffect.js'
import { Program } from './Program.js'
import * as Redis from './Redis.js'
import { verifyCache } from './VerifyCache.js'
import { CanWriteComments, RequiresAVerifiedEmailAddress } from './feature-flags.js'
import * as Nodemailer from './nodemailer.js'
import { PublicUrl } from './public-url.js'

pipe(
  Program,
  Layer.merge(Layer.effectDiscard(verifyCache)),
  Layer.launch,
  Effect.provideServiceEffect(
    RequiresAVerifiedEmailAddress,
    Config.withDefault(Config.boolean('REQUIRES_A_VERIFIED_EMAIL_ADDRESS'), false),
  ),
  Effect.provideServiceEffect(
    CanWriteComments,
    Effect.gen(function* () {
      const canWriteComments = yield* Config.withDefault(Config.boolean('CAN_WRITE_COMMENTS'), false)

      return () => canWriteComments
    }),
  ),
  Effect.provide(NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) })),
  Effect.provideServiceEffect(ExpressConfig, ExpressConfigLive),
  Effect.provide(
    Layer.mergeAll(
      LibsqlClient.layerConfig({
        url: Config.string('LIBSQL_URL'),
        authToken: Config.withDefault(Config.string('LIBSQL_AUTH_TOKEN'), undefined),
      }),
      Layer.effectDiscard(Effect.logDebug('Database connected')),
      Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logDebug('Database disconnected'))),
    ),
  ),
  Effect.provide(Nodemailer.layerConfig(Config.mapAttempt(Config.string('SMTP_URI'), url => new URL(url)))),
  Effect.provide(Redis.layer),
  Effect.provideServiceEffect(
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
  Effect.provideServiceEffect(
    PublicUrl,
    Config.mapAttempt(Config.string('PUBLIC_URL'), url => new URL(url)),
  ),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(Logger.replaceEffect(Logger.defaultLogger, DeprecatedLogger)),
  Effect.provideServiceEffect(DeprecatedLoggerEnv, makeDeprecatedLoggerEnv),
  Effect.provideServiceEffect(DeprecatedEnvVars, FptsToEffect.io(makeDeprecatedEnvVars)),
  Effect.scoped,
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
