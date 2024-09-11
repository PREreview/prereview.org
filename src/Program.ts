import { Headers, HttpMiddleware, HttpServer, HttpServerRequest } from '@effect/platform'
import { Effect, Layer, pipe } from 'effect'
import { Express } from './Context.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'
import { Router } from './Router.js'

const annotateLogsWithRequestId = HttpMiddleware.make(app =>
  pipe(
    HttpServerRequest.HttpServerRequest,
    Effect.map(req => req.headers),
    Effect.flatMap(Headers.get('Fly-Request-Id')),
    Effect.orElseSucceed(() => null),
    Effect.andThen(requestId => Effect.annotateLogs(app, 'requestId', requestId)),
  ),
)

export const Program = pipe(
  Router,
  Effect.catchTag('RouteNotFound', () => ExpressHttpApp),
  HttpServer.serve(annotateLogsWithRequestId),
  Layer.provide(Layer.effect(Express, expressServer)),
)
