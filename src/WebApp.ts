import {
  FileSystem,
  Headers,
  HttpMethod,
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  Path,
} from '@effect/platform'
import cookieSignature from 'cookie-signature'
import { Cause, Config, Duration, Effect, flow, Layer, Option, pipe, Redacted, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Express, ExpressConfig, FlashMessage, Locale, SessionSecret } from './Context.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'
import { CanChooseLocale, UseCrowdinInContext } from './feature-flags.js'
import { LegacyRouter } from './LegacyRouter.js'
import { CrowdinInContextLocale, DefaultLocale, SupportedLocales } from './locales/index.js'
import { PublicUrl } from './public-url.js'
import { FlashMessageSchema } from './response.js'
import { Router } from './Router.js'
import { securityHeaders } from './securityHeaders.js'
import * as TemplatePage from './TemplatePage.js'
import { Uuid } from './types/index.js'
import { LoggedInUser, UserSchema } from './user.js'

const removeTrailingSlashes = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest

    if (HttpMethod.hasBody(request.method) || '/' !== request.url[request.url.length - 1] || '/' === request.url) {
      return yield* app
    }

    return yield* HttpServerResponse.redirect(request.url.slice(0, request.url.length - 1), {
      status: StatusCodes.MOVED_PERMANENTLY,
    })
  }),
)

const serveStaticFiles = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest

    const path = yield* Path.Path

    const filePath = path.resolve(import.meta.dirname, '..', 'dist', 'assets', request.url.slice(1))

    if (!(yield* isFile(filePath))) {
      return yield* app
    }

    const response = yield* HttpServerResponse.file(filePath, {})

    if (!/\.[a-z0-9]{8,}\.[A-z0-9]+(?:\.map)?$/.exec(filePath)) {
      return yield* response
    }

    return yield* HttpServerResponse.setHeader(
      response,
      'Cache-Control',
      `public, max-age=${Duration.toSeconds('365 days')}, immutable`,
    )
  }),
)

const isFile = (path: string) =>
  pipe(
    FileSystem.FileSystem,
    Effect.andThen(fs => fs.stat(path)),
    Effect.map(stat => stat.type === 'File'),
    Effect.catchAll(() => Effect.succeed(false)),
  )

const logRequest = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const publicUrl = yield* PublicUrl

    const url = new URL(request.url, publicUrl)

    if (url.pathname === '/health') {
      return yield* app
    }

    yield* Effect.annotateLogs(Effect.logInfo('Received HTTP request'), {
      'http.method': request.method,
      'http.url': request.url,
      'http.path': url.pathname,
      'http.query': Object.fromEntries(url.searchParams),
      'http.referrer': Option.getOrUndefined(Headers.get(request.headers, 'Referer')),
      'http.userAgent': Option.getOrUndefined(Headers.get(request.headers, 'User-Agent')),
    })

    return yield* app
  }),
)

const addSecurityHeaders = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const publicUrl = yield* PublicUrl
    const response = yield* app
    const useCrowdinInContext = yield* UseCrowdinInContext

    return HttpServerResponse.setHeaders(response, securityHeaders(publicUrl.protocol, useCrowdinInContext))
  }),
)

const addXRobotsTagHeader = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const allowSiteCrawlers = yield* Config.withDefault(Config.boolean('ALLOW_SITE_CRAWLERS'), false)
    const response = yield* app

    if (allowSiteCrawlers) {
      return response
    }

    return HttpServerResponse.setHeader(response, 'X-Robots-Tag', 'none, noarchive')
  }),
)

const annotateLogsWithRequestId = HttpMiddleware.make(app =>
  pipe(
    HttpServerRequest.HttpServerRequest,
    Effect.map(req => req.headers),
    Effect.flatMap(Headers.get('Fly-Request-Id')),
    Effect.orElseSucceed(() => null),
    Effect.andThen(requestId => Effect.annotateLogs(app, 'requestId', requestId)),
  ),
)

const getFlashMessage = HttpMiddleware.make(app =>
  pipe(
    HttpServerRequest.schemaCookies(Schema.Struct({ 'flash-message': FlashMessageSchema })),
    Effect.matchEffect({
      onFailure: () => app,
      onSuccess: cookies => Effect.provideService(app, FlashMessage, cookies['flash-message']),
    }),
  ),
)

const getLoggedInUser = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const secret = yield* SessionSecret
    const { sessionCookie, sessionStore } = yield* ExpressConfig

    const session = yield* pipe(
      HttpServerRequest.schemaCookies(
        Schema.Struct({ session: pipe(Schema.propertySignature(Schema.String), Schema.fromKey(sessionCookie)) }),
      ),
      Effect.andThen(({ session }) => cookieSignature.unsign(session, Redacted.value(secret))),
      Effect.andThen(Schema.decodeUnknown(Uuid.UuidSchema)),
      Effect.andThen(sessionId => sessionStore.get(sessionId)),
      Effect.andThen(Schema.decodeUnknown(Schema.Struct({ user: UserSchema }))),
      Effect.option,
    )

    return yield* Option.match(session, {
      onNone: () => app,
      onSome: ({ user }) => Effect.provideService(app, LoggedInUser, user),
    })
  }),
)

const removeLocaleFromPathForRouting = HttpMiddleware.make(
  Effect.updateService(HttpServerRequest.HttpServerRequest, request =>
    request.modify({
      url: request.url.replace(/^\/en-US\//, '/').replace(/^\/pt-BR\//, '/'),
    }),
  ),
)

const getLocale = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const canChooseLocale = yield* CanChooseLocale
    const useCrowdinInContext = yield* UseCrowdinInContext

    if (useCrowdinInContext) {
      return yield* Effect.provideService(app, Locale, CrowdinInContextLocale)
    }

    if (!canChooseLocale) {
      return yield* Effect.provideService(app, Locale, DefaultLocale)
    }

    const localeFromPath = yield* pipe(
      HttpServerRequest.HttpServerRequest,
      Effect.andThen(request => request.url),
      Effect.andThen(path => path.split('/')[1]),
      Effect.andThen(Schema.decodeUnknown(Schema.Literal(...SupportedLocales))),
      Effect.orElseSucceed(() => undefined),
    )

    if (localeFromPath) {
      return yield* Effect.provideService(app, Locale, localeFromPath)
    }

    const locale = yield* pipe(
      HttpServerRequest.schemaCookies(Schema.Struct({ locale: Schema.Literal(...SupportedLocales) })),
      Effect.andThen(({ locale }) => locale),
      Effect.orElseSucceed(() => DefaultLocale),
    )

    return yield* Effect.provideService(app, Locale, locale)
  }),
)

const logStopped = Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logInfo('Server stopped')))

const logDefects = Effect.tapDefect(cause =>
  Effect.annotateLogs(
    Effect.logFatal('Failed to create response'),
    'cause',
    Cause.pretty(cause, { renderErrorCause: true }),
  ),
)

export const WebApp = pipe(
  Router,
  HttpRouter.concat(LegacyRouter),
  Effect.catchTag('RouteNotFound', () => Effect.interruptible(ExpressHttpApp)),
  serveStaticFiles,
  removeTrailingSlashes,
  addSecurityHeaders,
  addXRobotsTagHeader,
  getFlashMessage,
  getLoggedInUser,
  removeLocaleFromPathForRouting,
  getLocale,
  logRequest,
  logDefects,
  HttpServer.serve(flow(HttpMiddleware.logger, annotateLogsWithRequestId)),
  HttpServer.withLogAddress,
  Layer.provide(logStopped),
  Layer.provide(Layer.effect(Express, expressServer)),
  Layer.provide(TemplatePage.layer),
)
