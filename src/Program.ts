import { HttpRouter, HttpServer, HttpServerResponse } from '@effect/platform'
import { Effect, identity, Layer, Option, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Express, Redis } from './Context.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'

export const Program = pipe(
  HttpRouter.empty,
  HttpRouter.get(
    '/health',
    Effect.gen(function* () {
      const maybeRedis = yield* Effect.serviceOption(Redis)

      if (Option.isNone(maybeRedis)) {
        return yield* HttpServerResponse.json({ status: 'ok' })
      }

      const redis = maybeRedis.value

      if (redis.status !== 'ready') {
        yield* Effect.fail(new Error(`Redis not ready (${redis.status})`))
      }

      yield* Effect.tryPromise({ try: () => redis.ping(), catch: identity })

      return yield* HttpServerResponse.json({ status: 'ok' })
    }).pipe(
      Effect.catchAll(error =>
        Effect.gen(function* () {
          const asError = error instanceof Error ? error : new Error(String(error))
          yield* Effect.logError('healthcheck failed').pipe(
            Effect.annotateLogs({ message: asError.message, name: asError.name }),
          )

          return yield* HttpServerResponse.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE })
        }),
      ),
    ),
  ),
  Effect.catchTag('RouteNotFound', () => ExpressHttpApp),
  HttpServer.serve(),
  Layer.provide(Layer.effect(Express, expressServer)),
)
