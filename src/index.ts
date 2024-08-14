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
import { Array, Config, Context, Effect, Layer, Logger, Option, Ref, type Scope, flow, pipe } from 'effect'
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
import { type EnvironmentLabelEnv, type FathomEnv, type TemplatePageEnv, page, templatePage } from './page.js'
import type { PublicUrlEnv } from './public-url.js'
import { type FlashMessage, type PageResponse, toPage } from './response.js'
import type { User } from './user.js'

const env = decodeEnv(process)()

const loggerEnv: L.LoggerEnv = {
  clock: SystemClock,
  logger: pipe(C.log, L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
}

const redis: Effect.Effect<Context.Tag.Service<RedisService>, never, Scope.Scope> = Effect.acquireRelease(
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

class FlashMessageState extends Context.Tag('FlashMessage')<FlashMessageState, Ref.Ref<FlashMessage | undefined>>() {}

const toHttpServerResponse = (
  pageResponse: RT.ReaderTask<Context.Tag.Service<LegacyDeps> & Context.Tag.Service<PerRequestDeps>, PageResponse>,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, LegacyDeps | PerRequestDeps | FlashMessageState> =>
  Effect.gen(function* () {
    const legacyDeps = yield* LegacyDeps
    const perRequestDeps = yield* PerRequestDeps
    const legacyResponse = yield* Effect.promise(pageResponse({ ...legacyDeps, ...perRequestDeps }))
    const flashMessage = yield* FlashMessageState
    const message = yield* Ref.get(flashMessage)
    console.log('>>> get ref:', message)
    return yield* HttpServerResponse.html(
      templatePage(
        toPage({
          locale: DefaultLocale,
          message,
          userOnboarding: undefined,
          response: legacyResponse,
          user: Option.getOrUndefined(perRequestDeps.user),
        }),
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

const orcid = Effect.gen(function* () {
  const redisClient = yield* RedisService
  const sessionId = '853dbd33-f595-4170-b5b3-e345a866fcc8'
  const value = yield* Schema.encode(sessionSchema)({
    value: {
      user: {
        name: 'Josiah Carberry',
        orcid: '0000-0002-1825-0097',
        pseudonym: 'Orange Panda',
      },
    },
  })
  yield* Effect.tryPromise(() => redisClient.set(`sessions:${sessionId}`, value))
  yield* FlashMessageState.pipe(Effect.flatMap(Ref.set('logged-in' as FlashMessage | undefined)))

  return yield* pipe(HttpServerResponse.empty({ status: 301, headers: Headers.fromInput({ location: '/' }) }))
})

const ParamsSchema = Schema.Struct({ id: Schema.NumberFromString, foo: Schema.String })

const thePage = (params: Schema.Schema.Type<typeof ParamsSchema>) => HttpServerResponse.json(params)

const ParamsHandler = Effect.gen(function* () {
  const pathParams = yield* HttpRouter.schemaParams(ParamsSchema)

  return yield* thePage({ ...pathParams })
})

const Router = HttpRouter.empty.pipe(
  HttpRouter.get('/about', toHttpServerResponse(aboutUs)),
  HttpRouter.get('/orcid', orcid),
  HttpRouter.get('/health', healthRoute),
  HttpRouter.get('/params/:id', ParamsHandler),
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

const sessionSchema = Schema.parseJson(
  Schema.Struct({
    value: Schema.Struct({
      user: Schema.Struct({
        name: Schema.String,
        orcid: Schema.String,
        pseudonym: Schema.String,
      }),
    }),
  }),
)

const providePerRequestsDeps = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const redisClient = yield* RedisService
    const user = yield* pipe(
      HttpServerRequest.schemaCookies(Schema.Struct({ session: Schema.String })),
      Effect.andThen(({ session }) => session),
      Effect.andThen(signed => signed.split('.')),
      Effect.andThen(Array.head),
      Effect.andThen(id => redisClient.get(`sessions:${id}`)),
      Effect.tap(value => Effect.succeed(console.log('+++ ', value))),
      Effect.andThen(Schema.decodeUnknown(sessionSchema)),
      Effect.andThen(session => session.value.user),
      Effect.asSome,
      Effect.tapError(e => Effect.succeed(console.log('>>> ', e))),
      Effect.orElseSucceed(() => Option.none()),
    )

    const loadFlashMessage = pipe(
      HttpServerRequest.schemaCookies(Schema.Struct({ 'flash-message': Schema.UndefinedOr(Schema.String) })),
      Effect.andThen(record => record['flash-message'] as FlashMessage | undefined),
      Effect.tap(value => console.log('>>> loading:', value)),
      Effect.andThen(Ref.make),
    )

    const persistFlashMessage = (response: HttpServerResponse.HttpServerResponse) =>
      Effect.gen(function* () {
        const message = (yield* pipe(FlashMessageState, Effect.andThen(Ref.get))) ?? 'no-flash-message'
        console.log('>>> persisting:', message)
        console.log('>>> response:', response)
        const modified = yield* pipe(
          HttpServerResponse.setCookie(response, 'flash-message', message),
          Effect.andThen(HttpServerResponse.setHeader('foo', 'bar')),
        )
        console.log('>>> modified:', modified)
        return modified
      })

    return yield* pipe(
      app,
      Effect.provideService(PerRequestDeps, {
        translate: localeTranslate(DefaultLocale),
        user: user as Option.Option<User>,
      }),
      Effect.andThen(persistFlashMessage),
      Effect.provideServiceEffect(FlashMessageState, loadFlashMessage),
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
  providePerRequestsDeps,
  HttpServer.serve(flow(HttpMiddleware.logger, requestIdLogging)),
  Layer.provide(NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) })),
  Layer.provide(redisLayer),
  Layer.provide(Layer.effect(LegacyDeps, legacyDeps)),
  Layer.provide(Layer.succeed(LegacyConfig, legacyConfig)),
)

Layer.launch(Server).pipe(Effect.provide(Logger.pretty), NodeRuntime.runMain)
