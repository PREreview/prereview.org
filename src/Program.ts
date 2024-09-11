import { HttpServer } from '@effect/platform'
import { Effect, Layer, pipe } from 'effect'
import { Express } from './Context.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'
import { Router } from './Router.js'

export const Program = pipe(
  Router,
  Effect.catchTag('RouteNotFound', () => ExpressHttpApp),
  HttpServer.serve(),
  Layer.provide(Layer.effect(Express, expressServer)),
)
