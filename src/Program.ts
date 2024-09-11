import { HttpRouter, HttpServer } from '@effect/platform'
import { Effect, Layer, pipe } from 'effect'
import { Express } from './Context.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'

export const Program = pipe(
  HttpRouter.empty,
  Effect.catchTag('RouteNotFound', () => ExpressHttpApp),
  HttpServer.serve(),
  Layer.provide(Layer.effect(Express, expressServer)),
)
