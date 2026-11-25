import { Array, ByteSize, Effect, flow, Layer, Option, pipe } from 'effect'
import {
  HttpMiddleware as EffectHttpMiddleware,
  HttpServer,
  HttpServerRequest,
  Multipart,
  UrlParams,
} from 'effect/http'
import { CmsContent } from '../CmsContent/index.ts'
import { ContentfulPages } from '../ExternalInteractions/ContentfulPages/index.ts'
import * as HttpMiddleware from '../HttpMiddleware/index.ts'
import { SpotlightBanners } from '../SpotlightBanners/index.ts'
import { Router } from './Router/index.ts'
import * as TemplatePage from './TemplatePage.ts'

export { optionsLayer, optionsLayerConfig, TemplatePageOptions } from './TemplatePage.ts'

const spanName = (request: HttpServerRequest.HttpServerRequest) =>
  Option.match(HttpServerRequest.toURL(request), {
    onNone: () => request.method,
    onSome: url => `${request.method} ${url.pathname}`,
  })

// Email verification tokens and the ORCID OAuth callback's code and state.
const redactedUrlParamNames = Layer.effect(
  UrlParams.CurrentRedactedNames,
  Effect.map(UrlParams.CurrentRedactedNames, Array.appendAll(['verify', 'verificationToken', 'code', 'state'])),
)

export const layer = pipe(
  Layer.unwrap(
    Effect.map(Router, router =>
      pipe(
        router,
        Effect.provideService(Multipart.MaxFileSize, ByteSize.mebibytes(5)),
        HttpMiddleware.removeLocaleFromPathForRouting,
        HttpMiddleware.serveStaticFiles,
        HttpMiddleware.removeTrailingSlashes,
        HttpMiddleware.addSecurityHeaders,
        HttpMiddleware.addXRobotsTagHeader,
        HttpMiddleware.addTraceIdHeader,
        HttpMiddleware.getFlashMessage,
        HttpMiddleware.getLoggedInUser,
        HttpMiddleware.getLocale,
        HttpMiddleware.stopSuspiciousRequests,
        HttpMiddleware.logRequest,
        HttpMiddleware.logDefects,
        HttpServer.serve(flow(HttpMiddleware.logger, HttpMiddleware.annotateLogsWithRequestId)),
      ),
    ),
  ),
  HttpServer.withLogAddress,
  Layer.provide(Layer.succeed(EffectHttpMiddleware.SpanNameGenerator, spanName)),
  Layer.provide(redactedUrlParamNames),
  Layer.provide(HttpMiddleware.logStopped),
  Layer.provide([TemplatePage.layer, CmsContent.layer, SpotlightBanners.layer]),
  Layer.provide(ContentfulPages.layer),
)
