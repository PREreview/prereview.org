import {
  Headers,
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform'
import { NodeHttpServer, NodeHttpServerRequest, NodeRuntime } from '@effect/platform-node'
import { Schema } from '@effect/schema'
import { SystemClock } from 'clock-ts'
import * as dns from 'dns'
import { Array, Config, Context, Effect, Layer, Logger, Option, type Scope, flow, pipe } from 'effect'
import type { FetchEnv } from 'fetch-fp-ts'
import * as C from 'fp-ts/lib/Console.js'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import { Redis as IoRedis } from 'ioredis'
import * as L from 'logger-fp-ts'
import fetch from 'make-fetch-happen'
import { createServer } from 'node:http'
import { aboutUs } from './about-us.js'
import { withEnv } from './app.js'
import { RedisService, effectifiedExpressApp } from './effectified-app.js'
import { decodeEnv } from './env.js'
import type { SleepEnv } from './fetch.js'
import type { GhostApiEnv } from './ghost.js'
import { DefaultLocale, type LocaleTranslate, localeTranslate } from './locales/index.js'
import { type EnvironmentLabelEnv, type FathomEnv, type TemplatePageEnv, page } from './page.js'
import type { PublicUrlEnv } from './public-url.js'
import { type PageResponse, toPage } from './response.js'
import type { User } from './user.js'

const env = decodeEnv(process)()

const loggerEnv: L.LoggerEnv = {
  clock: SystemClock,
  logger: pipe(C.log, L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
}

const redis: Effect.Effect<IoRedis, never, Scope.Scope> = Effect.acquireRelease(
  Effect.suspend(() => {
    const redis = new IoRedis(env.REDIS_URI.href, {
      commandTimeout: 2 * 1000,
      enableAutoPipelining: true,
    })
    redis.on('connect', () => L.debug('Redis connected')(loggerEnv)())
    redis.on('close', () => L.debug('Redis connection closed')(loggerEnv)())
    redis.on('reconnecting', () => L.info('Redis reconnecting')(loggerEnv)())
    redis.removeAllListeners('error')
    redis.on('error', (error: Error) => L.errorP('Redis connection error')({ error: error.message })(loggerEnv)())
    return Effect.succeed(redis)
  }),
  redis => Effect.promise(() => redis.quit()),
)

const redisLayer: Layer.Layer<RedisService> = Layer.scoped(RedisService, redis)

if (env.ZENODO_URL.href.includes('sandbox')) {
  dns.setDefaultResultOrder('ipv4first')
}

const healthRoute = Effect.gen(function* () {
  const redis = yield* RedisService
  yield* Effect.log('healthcheck called')
  yield* Effect.tryPromise({
    try: async () => {
      if (redis.status !== 'ready') {
        throw new Error(`Redis not ready (${redis.status})`)
      }

      await redis.ping()
    },
    catch: () => {
      return HttpServerResponse.raw('redis not ready', { status: 500 })
    },
  })
  return HttpServerResponse.raw('healthy')
})

const toHttpServerResponse = (
  pageResponse: RT.ReaderTask<Context.Tag.Service<LegacyDeps> & Context.Tag.Service<PerRequestDeps>, PageResponse>,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, LegacyDeps | PerRequestDeps> =>
  Effect.gen(function* () {
    const legacyDeps = yield* LegacyDeps
    const perRequestDeps = yield* PerRequestDeps
    const legacyResponse = yield* Effect.promise(pageResponse({ ...legacyDeps, ...perRequestDeps }))
    return yield* HttpServerResponse.html(
      toPage({ locale: DefaultLocale, message: undefined, userOnboarding: undefined })(
        legacyResponse,
        Option.getOrUndefined(perRequestDeps.user),
      )(legacyDeps).toString(),
    )
  })

class LegacyConfig extends Context.Tag('LegacyConfig')<
  LegacyConfig,
  GhostApiEnv & FathomEnv & PublicUrlEnv & EnvironmentLabelEnv
>() {}

interface LocaleTranslateEnv {
  translate: LocaleTranslate
}

interface UserEnv {
  user: Option.Option<User>
}

class LegacyDeps extends Context.Tag('LegacyDeps')<
  LegacyDeps,
  Context.Tag.Service<LegacyConfig> & FetchEnv & SleepEnv & TemplatePageEnv
>() {}

class PerRequestDeps extends Context.Tag('PerRequestDeps')<PerRequestDeps, LocaleTranslateEnv & UserEnv>() {}

const Router = HttpRouter.empty.pipe(
  HttpRouter.get('/about', toHttpServerResponse(aboutUs)),
  HttpRouter.get('/health', healthRoute),
)

const requestIdLogging = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const requestId = yield* pipe(
      HttpServerRequest.HttpServerRequest,
      Effect.map(req => req.headers),
      Effect.flatMap(Headers.get('request-id')),
      Effect.orElseSucceed(() => null),
    )
    return yield* app.pipe(Effect.annotateLogs('requestId', requestId))
  }),
)

const legacyConfig = LegacyConfig.of({
  environmentLabel: env.ENVIRONMENT_LABEL,
  ghostApi: {
    key: env.GHOST_API_KEY,
  },
  publicUrl: env.PUBLIC_URL,
  fathomId: env.FATHOM_SITE_ID,
})

const legacyDeps = Effect.gen(function* () {
  const config = yield* LegacyConfig
  return LegacyDeps.of({
    ...config,
    fetch: fetch.defaults({
      cachePath: 'data/cache',
      headers: {
        'User-Agent': `PREreview (${env.PUBLIC_URL.href}; mailto:engineering@prereview.org)`,
      },
    }),
    sleep: duration => new Promise(resolve => setTimeout(resolve, duration)),
    templatePage: withEnv(page, config),
  })
})

const providePerRequestsDeps = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const sessionId = yield* pipe(
      HttpServerRequest.schemaCookies(Schema.Struct({ session: Schema.String })),
      Effect.andThen(({ session }) => session),
      Effect.andThen(signed => signed.split('.')),
      Effect.andThen(Array.head),
      Effect.asSome,
      Effect.orElseSucceed(() => Option.none()),
    )
    return yield* app.pipe(
      Effect.provideService(PerRequestDeps, { translate: localeTranslate(DefaultLocale), user: Option.none() }),
    )
  }),
)

const Server = Router.pipe(
  Effect.catchTags({
    RouteNotFound: routeNotFound =>
      Effect.gen(function* () {
        const request = NodeHttpServerRequest.toIncomingMessage(routeNotFound.request)
        const response = NodeHttpServerRequest.toServerResponse(routeNotFound.request)
        const expressApp = yield* effectifiedExpressApp
        expressApp(request, response)
        yield* Effect.promise(() => new Promise(resolve => response.once('close', resolve)))
        return HttpServerResponse.empty()
      }),
  }),
  HttpServer.serve(flow(HttpMiddleware.logger, requestIdLogging, providePerRequestsDeps)),
  Layer.provide(NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) })),
  Layer.provide(redisLayer),
  Layer.provide(Layer.effect(LegacyDeps, legacyDeps)),
  Layer.provide(Layer.succeed(LegacyConfig, legacyConfig)),
)

Layer.launch(Server).pipe(Effect.provide(Logger.pretty), NodeRuntime.runMain)
