import { Headers, HttpMiddleware, HttpServer, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import cspBuilder from 'content-security-policy-builder'
import { Config, Effect, Layer, pipe } from 'effect'
import { Express } from './Context.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'
import { Router } from './Router.js'

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

export const Program = pipe(
  Router,
  Effect.catchTag('RouteNotFound', () => ExpressHttpApp),
  addSecurityHeaders,
  addXRobotsTagHeader,
  HttpServer.serve(annotateLogsWithRequestId),
  Layer.provide(Layer.effect(Express, expressServer)),
)
