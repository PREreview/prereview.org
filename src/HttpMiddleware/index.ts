import {
  FileSystem,
  Headers,
  HttpMethod,
  HttpMiddleware,
  HttpServerRequest,
  HttpServerResponse,
  Path,
} from '@effect/platform'
import cookieSignature from 'cookie-signature'
import { Array, Cause, Config, Duration, Effect, Layer, Option, pipe, Redacted, Schema, String } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { ExpressConfig, FlashMessage, Locale, SessionSecret } from '../Context.js'
import * as FeatureFlags from '../FeatureFlags.js'
import { CrowdinInContextLocale, DefaultLocale } from '../locales/index.js'
import { PublicUrl } from '../public-url.js'
import { FlashMessageSchema } from '../response.js'
import { securityHeaders } from '../securityHeaders.js'
import { Uuid } from '../types/index.js'
import { UserOnboardingService } from '../user-onboarding.js'
import { EnsureUserIsLoggedIn, LoggedInUser, SessionId, UserSchema } from '../user.js'
import { detectLocale } from './DetectLocale.js'
import { forceLogIn } from './ForceLogIn.js'
import * as LocaleCookie from './LocaleCookie.js'
import * as LocaleInPath from './LocaleInPath.js'

export const { logger, make, withLoggerDisabled } = HttpMiddleware

export const removeTrailingSlashes = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const publicUrl = yield* PublicUrl

    if (HttpMethod.hasBody(request.method) || '/' !== request.url[request.url.length - 1] || '/' === request.url) {
      return yield* app
    }

    return yield* HttpServerResponse.redirect(
      new URL(`${publicUrl.origin}${request.url.slice(0, request.url.length - 1)}`),
      {
        status: StatusCodes.MOVED_PERMANENTLY,
      },
    )
  }),
)

export const serveStaticFiles = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest

    const path = yield* Path.Path

    const filePath = path.resolve(import.meta.dirname, '..', '..', 'dist', 'assets', request.url.slice(1))

    if (
      !filePath.startsWith(path.resolve(import.meta.dirname, '..', '..', 'dist', 'assets')) ||
      !(yield* isFile(filePath))
    ) {
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

export const logRequest = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const publicUrl = yield* PublicUrl

    const url = new URL(`${publicUrl.origin}${request.url}`)

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

export const addSecurityHeaders = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const publicUrl = yield* PublicUrl
    const response = yield* app
    const useCrowdinInContext = yield* FeatureFlags.useCrowdinInContext

    return HttpServerResponse.setHeaders(response, securityHeaders(publicUrl.protocol, useCrowdinInContext))
  }),
)

export const addXRobotsTagHeader = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const allowSiteCrawlers = yield* Config.withDefault(Config.boolean('ALLOW_SITE_CRAWLERS'), false)
    const response = yield* app

    if (allowSiteCrawlers) {
      return response
    }

    return HttpServerResponse.setHeader(response, 'X-Robots-Tag', 'none, noarchive')
  }),
)

export const annotateLogsWithRequestId = HttpMiddleware.make(app =>
  pipe(
    HttpServerRequest.HttpServerRequest,
    Effect.map(req => req.headers),
    Effect.flatMap(Headers.get('Fly-Request-Id')),
    Effect.orElseSucceed(() => null),
    Effect.andThen(requestId => Effect.annotateLogs(app, 'requestId', requestId)),
  ),
)

export const getFlashMessage = HttpMiddleware.make(app =>
  pipe(
    HttpServerRequest.schemaCookies(Schema.Struct({ 'flash-message': FlashMessageSchema })),
    Effect.matchEffect({
      onFailure: () => app,
      onSuccess: cookies => Effect.provideService(app, FlashMessage, cookies['flash-message']),
    }),
  ),
)

export const getLoggedInUser = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const secret = yield* SessionSecret
    const { sessionCookie, sessionStore, userOnboardingStore } = yield* ExpressConfig

    const sessionId = yield* pipe(
      HttpServerRequest.schemaCookies(
        Schema.Struct({ session: pipe(Schema.propertySignature(Schema.String), Schema.fromKey(sessionCookie)) }),
      ),
      Effect.andThen(({ session }) => cookieSignature.unsign(session, Redacted.value(secret))),
      Effect.andThen(Schema.decodeUnknown(Uuid.UuidSchema)),
      Effect.option,
    )

    const session = yield* Option.match(sessionId, {
      onNone: () => Effect.succeedNone,
      onSome: sessionId =>
        pipe(
          Effect.tryPromise(() => sessionStore.get(sessionId)),
          Effect.andThen(Schema.decodeUnknown(Schema.Struct({ user: UserSchema }))),
          Effect.option,
        ),
    })

    return yield* Option.match(Option.all({ session, sessionId }), {
      onNone: () => app,
      onSome: ({ session: { user }, sessionId }) =>
        Effect.gen(function* () {
          const userOnboarding = yield* pipe(
            Effect.tryPromise(() => userOnboardingStore.get(user.orcid)),
            Effect.andThen(Schema.decodeUnknown(Schema.Struct({ seenMyDetailsPage: Schema.Boolean }))),
            Effect.orElseSucceed(() => ({ seenMyDetailsPage: false })),
          )

          return yield* pipe(
            app,
            Effect.provideService(SessionId, sessionId),
            Effect.provideService(LoggedInUser, user),
            Effect.provideService(UserOnboardingService, userOnboarding),
          )
        }),
    })
  }),
)

export const ensureUserIsLoggedIn = HttpMiddleware.make(app =>
  pipe(
    EnsureUserIsLoggedIn,
    Effect.andThen(user => Effect.provideService(app, LoggedInUser, user)),
    Effect.catchTag('UserIsNotLoggedIn', () => forceLogIn),
  ),
)

export const removeLocaleFromPathForRouting = HttpMiddleware.make(
  Effect.updateService(HttpServerRequest.HttpServerRequest, request =>
    request.modify({ url: LocaleInPath.removeLocaleFromPath(request.url) }),
  ),
)

export const getLocale = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const canChooseLocale = yield* FeatureFlags.canChooseLocale
    const useCrowdinInContext = yield* FeatureFlags.useCrowdinInContext

    if (useCrowdinInContext) {
      return yield* Effect.provideService(app, Locale, CrowdinInContextLocale)
    }

    if (!canChooseLocale) {
      return yield* Effect.provideService(app, Locale, DefaultLocale)
    }

    const localeFromPath = yield* pipe(
      HttpServerRequest.HttpServerRequest,
      Effect.andThen(request => request.url),
      Effect.andThen(LocaleInPath.getLocaleFromPath),
      Effect.orElseSucceed(() => undefined),
    )

    if (typeof localeFromPath === 'string') {
      const response = yield* Effect.provideService(app, Locale, localeFromPath)
      return yield* pipe(response, LocaleCookie.setLocaleCookie(localeFromPath))
    }

    const locale = yield* Effect.andThen(LocaleCookie.getLocaleFromCookie, Option.getOrUndefined)

    if (typeof locale === 'string') {
      return yield* Effect.provideService(app, Locale, locale)
    }

    const request = yield* HttpServerRequest.HttpServerRequest

    const detectedLocale = pipe(
      Headers.get(request.headers, 'Accept-Language'),
      Option.andThen(detectLocale),
      Option.getOrElse(() => DefaultLocale),
    )

    const response = yield* Effect.provideService(app, Locale, detectedLocale)

    return yield* pipe(response, LocaleCookie.setLocaleCookie(detectedLocale))
  }),
)

export const stopSuspiciousRequests = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest

    const isRequestSuspicious = Array.findFirst(
      [
        '../', // represents ../
        '%2e%2e%2f', // represents ../
        '%2e%2e/', // represents ../
        '..%2f', // represents ../
        '..\\', // represents ..\
        '%2e%2e%5c', // represents ..\
        '%2e%2e\\', // represents ..\
        '..%5c', // represents ..\
        '%252e%252e%255c', // represents ..\
        '..%255c', // represents ..\
        '..%5c', // represents ..\
        '%252e%252e%255c', // represents ..\
        '..%255c', // represents ..\
      ],
      search => String.includes(search)(request.url),
    )

    if (Option.isSome(isRequestSuspicious)) {
      return yield* HttpServerResponse.empty({ status: StatusCodes.NOT_FOUND })
    }

    return yield* app
  }),
)

export const logStopped = Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logInfo('Server stopped')))

export const logDefects = Effect.tapDefect(cause =>
  Effect.annotateLogs(
    Effect.logFatal('Failed to create response'),
    'cause',
    Cause.pretty(cause, { renderErrorCause: true }),
  ),
)
