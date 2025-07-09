import { HttpServer } from '@effect/platform'
import { Effect, flow, Layer, pipe } from 'effect'
import { Express } from './Context.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'
import * as HttpMiddleware from './HttpMiddleware/index.js'
import { Router } from './Router/index.js'
import * as TemplatePage from './TemplatePage.js'

export const WebApp = pipe(
  Router,
  Effect.catchTag('RouteNotFound', () => Effect.interruptible(ExpressHttpApp)),
  HttpMiddleware.removeLocaleFromPathForRouting,
  HttpMiddleware.serveStaticFiles,
  HttpMiddleware.removeTrailingSlashes,
  HttpMiddleware.addSecurityHeaders,
  HttpMiddleware.addXRobotsTagHeader,
  HttpMiddleware.getFlashMessage,
  HttpMiddleware.getLoggedInUser,
  HttpMiddleware.getLocale,
  HttpMiddleware.stopSuspiciousRequests,
  HttpMiddleware.logRequest,
  HttpMiddleware.logDefects,
  HttpServer.serve(flow(HttpMiddleware.logger, HttpMiddleware.annotateLogsWithRequestId)),
  HttpServer.withLogAddress,
  Layer.provide(HttpMiddleware.logStopped),
  Layer.provide(Layer.effect(Express, expressServer)),
  Layer.provide(TemplatePage.layer),
)
