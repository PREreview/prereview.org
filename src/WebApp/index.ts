import { FileSystem, HttpServer, Multipart } from '@effect/platform'
import { flow, Layer, Option, pipe } from 'effect'
import * as HttpMiddleware from '../HttpMiddleware/index.ts'
import { Router } from './Router/index.ts'
import * as TemplatePage from './TemplatePage.ts'

export const layer = pipe(
  Router,
  Multipart.withMaxFileSize(Option.some(FileSystem.MiB(5))),
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
  Layer.provide(TemplatePage.layer),
)
