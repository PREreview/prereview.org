import {
  FetchHttpClient,
  Headers,
  HttpMiddleware,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform'
import { Schema } from '@effect/schema'
import cspBuilder from 'content-security-policy-builder'
import cookieSignature from 'cookie-signature'
import { type Array, Config, Effect, flow, Layer, Match, Option, pipe, Runtime } from 'effect'
import type { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import * as Uuid from 'uuid-ts'
import {
  DeprecatedLoggerEnv,
  DeprecatedSleepEnv,
  EventStore,
  Express,
  ExpressConfig,
  Locale,
  LoggedInUser,
} from './Context.js'
import { makeDeprecatedSleepEnv } from './DeprecatedServices.js'
import { ExpressHttpApp } from './ExpressHttpApp.js'
import { expressServer } from './ExpressServer.js'
import * as Feedback from './Feedback/index.js'
import { collapseRequests, logFetch } from './fetch.js'
import { getPreprint as getPreprintUtil } from './get-preprint.js'
import { DefaultLocale } from './locales/index.js'
import * as Preprint from './preprint.js'
import * as Prereview from './Prereview.js'
import { Router } from './Router.js'
import * as SqliteEventStore from './SqliteEventStore.js'
import * as TemplatePage from './TemplatePage.js'
import type { IndeterminatePreprintId } from './types/preprint-id.js'
import { UserSchema } from './user.js'
import { getPrereviewFromZenodo } from './zenodo.js'

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
      Effect.andThen(Option.liftPredicate(Uuid.isUuid)),
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

const getPrereview = Layer.effect(
  Prereview.GetPrereview,
  Effect.gen(function* () {
    const { wasPrereviewRemoved, zenodoApiKey, zenodoUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv
    const getPreprintService = yield* Preprint.GetPreprint
    const runtime = yield* Effect.runtime()
    const sleep = yield* DeprecatedSleepEnv

    const getPreprint = (id: IndeterminatePreprintId) => () =>
      Runtime.runPromise(runtime)(
        pipe(
          getPreprintService(id),
          Effect.catchTags({
            PreprintIsNotFound: () => Effect.fail('not-found' as const),
            PreprintIsUnavailable: () => Effect.fail('unavailable' as const),
          }),
          Effect.either,
        ),
      )

    return id =>
      pipe(
        Effect.promise(
          getPrereviewFromZenodo(id)({
            fetch,
            getPreprint,
            ...sleep,
            wasPrereviewRemoved,
            zenodoApiKey,
            zenodoUrl,
            ...logger,
          }),
        ),
        Effect.andThen(
          flow(
            Match.value,
            Match.when({ _tag: 'Left' }, response => Effect.fail(response.left)),
            Match.when({ _tag: 'Right' }, response =>
              Effect.succeed(
                new Prereview.Prereview({
                  ...response.right,
                  authors: {
                    ...response.right.authors,
                    named: fixArrayType(response.right.authors.named),
                  },
                  id,
                }),
              ),
            ),
            Match.exhaustive,
          ),
        ),
        Effect.mapError(
          flow(
            Match.value,
            Match.when('not-found', () => new Prereview.PrereviewIsNotFound()),
            Match.when('removed', () => new Prereview.PrereviewWasRemoved()),
            Match.when('unavailable', () => new Prereview.PrereviewIsUnavailable()),
            Match.exhaustive,
          ),
        ),
      )
  }),
)

const getPreprint = Layer.effect(
  Preprint.GetPreprint,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const sleep = yield* DeprecatedSleepEnv

    return id =>
      pipe(
        Effect.promise(getPreprintUtil(id)({ fetch, ...sleep })),
        Effect.andThen(
          flow(
            Match.value,
            Match.when({ _tag: 'Left' }, response => Effect.fail(response.left)),
            Match.when({ _tag: 'Right' }, response => Effect.succeed(response.right)),
            Match.exhaustive,
          ),
        ),
        Effect.mapError(
          flow(
            Match.value,
            Match.when('not-found', () => new Preprint.PreprintIsNotFound()),
            Match.when('unavailable', () => new Preprint.PreprintIsUnavailable()),
            Match.exhaustive,
          ),
        ),
      )
  }),
)

const setUpFetch = Layer.effect(
  FetchHttpClient.Fetch,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv

    return pipe({ fetch, ...logger }, logFetch(), collapseRequests()).fetch
  }),
)

const logStopped = Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logInfo('Server stopped')))

export const Program = pipe(
  Router,
  Effect.catchTag('RouteNotFound', () => ExpressHttpApp),
  addSecurityHeaders,
  addXRobotsTagHeader,
  getLoggedInUser,
  Effect.provideService(Locale, DefaultLocale),
  HttpServer.serve(annotateLogsWithRequestId),
  HttpServer.withLogAddress,
  Layer.provide(logStopped),
  Layer.provide(Layer.effect(Express, expressServer)),
  Layer.provide(Layer.effect(TemplatePage.TemplatePage, TemplatePage.make)),
  Layer.provide(getPrereview),
  Layer.provide(getPreprint),
  Layer.provide(
    Layer.effect(
      Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview,
      Feedback.makeGetAllUnpublishedFeedbackByAnAuthorForAPrereview,
    ),
  ),
  Layer.provide(Layer.effect(EventStore, SqliteEventStore.make)),
  Layer.provide(setUpFetch),
  Layer.provide(Layer.effect(DeprecatedSleepEnv, makeDeprecatedSleepEnv)),
)

function fixArrayType<A>(array: ReadonlyNonEmptyArray<A>): Array.NonEmptyReadonlyArray<A> {
  return array as Array.NonEmptyReadonlyArray<A>
}
