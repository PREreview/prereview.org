import { Headers, HttpMiddleware, HttpServer, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Schema } from '@effect/schema'
import cspBuilder from 'content-security-policy-builder'
import cookieSignature from 'cookie-signature'
import { Cause, Config, Effect, flow, Layer, Option, pipe } from 'effect'
import { Express, ExpressConfig, Locale, LoggedInUser } from './Context.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'
import { DefaultLocale } from './locales/index.js'
import { Router } from './Router.js'
import * as TemplatePage from './TemplatePage.js'
import { Uuid } from './types/index.js'
import { UserSchema } from './user.js'

const addSecurityHeaders = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const publicUrl = yield* Config.mapAttempt(Config.string('PUBLIC_URL'), url => new URL(url))
    const response = yield* app

    return HttpServerResponse.setHeaders(response, {
      'Content-Security-Policy': cspBuilder({
        directives: {
          'script-src': ["'self'", 'cdn.usefathom.com'],
          'img-src': [
            "'self'",
            'data:',
            'avatars.slack-edge.com',
            'cdn.usefathom.com',
            'content.prereview.org',
            'res.cloudinary.com',
            'secure.gravatar.com',
            '*.wp.com',
          ],
          'upgrade-insecure-requests': publicUrl.protocol === 'https:',
          'default-src': "'self'",
          'base-uri': "'self'",
          'font-src': ["'self'", 'https:', 'data:'],
          'form-action': "'self'",
          'frame-ancestors': "'self'",
          'object-src': "'none'",
          'script-src-attr': "'none'",
          'style-src': ["'self'", 'https:', "'unsafe-inline'"],
        },
      }),
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Origin-Agent-Cluster': '?1',
      'Referrer-Policy': 'no-referrer',
      'Strict-Transport-Security': publicUrl.protocol === 'https:' ? 'max-age=15552000; includeSubDomains' : undefined,
      'X-Content-Type-Options': 'nosniff',
      'X-DNS-Prefetch-Control': 'off',
      'X-Download-Options': 'noopen',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'X-XSS-Protection': '0',
    })
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

const getLoggedInUser = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const { secret, sessionCookie, sessionStore } = yield* ExpressConfig

    const session = yield* pipe(
      HttpServerRequest.schemaCookies(
        Schema.Struct({ session: pipe(Schema.propertySignature(Schema.String), Schema.fromKey(sessionCookie)) }),
      ),
      Effect.andThen(({ session }) => cookieSignature.unsign(session, secret)),
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
  Effect.catchTag('RouteNotFound', () => ExpressHttpApp),
  addSecurityHeaders,
  addXRobotsTagHeader,
  getLoggedInUser,
  Effect.provideService(Locale, DefaultLocale),
  logDefects,
  HttpServer.serve(flow(HttpMiddleware.logger, annotateLogsWithRequestId)),
  HttpServer.withLogAddress,
  Layer.provide(logStopped),
  Layer.provide(Layer.effect(Express, expressServer)),
  Layer.provide(Layer.effect(TemplatePage.TemplatePage, TemplatePage.make)),
)
