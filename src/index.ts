import { HttpRouter, HttpServer, HttpServerResponse } from '@effect/platform'
import { NodeHttpServer, NodeHttpServerRequest, NodeRuntime } from '@effect/platform-node'
import { SystemClock } from 'clock-ts'
import * as dns from 'dns'
import { Config, Effect, Layer, type Scope } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import { pipe } from 'fp-ts/lib/function.js'
import { Redis as IoRedis } from 'ioredis'
import * as L from 'logger-fp-ts'
import { createServer } from 'node:http'
import { RedisService, effectifiedExpressApp } from './effectified-app.js'
import { decodeEnv } from './env.js'

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

const Router = HttpRouter.empty.pipe(HttpRouter.get('/', HttpServerResponse.html('hello')))

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
  HttpServer.serve(),
  Layer.provide(NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3000) })),
  Layer.provide(redisLayer),
)

Layer.launch(Server).pipe(NodeRuntime.runMain)
