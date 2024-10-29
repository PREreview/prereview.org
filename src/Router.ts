import { Headers, HttpMiddleware, HttpRouter, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, identity, Option, pipe, Record } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { ExpressConfig, Locale, LoggedInUser, Redis } from './Context.js'
import {
  type PageResponse,
  type RedirectResponse,
  type StreamlinePageResponse,
  toPage,
  type TwoUpPageResponse,
} from './response.js'
import * as Routes from './routes.js'
import { TemplatePage } from './TemplatePage.js'
import * as WriteFeedbackFlow from './WriteFeedbackFlow/index.js'

const logRequest = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const { publicUrl } = yield* ExpressConfig

    const url = new URL(request.url, publicUrl)

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

export const Router = pipe(
  HttpRouter.empty,
  HttpRouter.get(
    Routes.WriteFeedback.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedback.schema),
      Effect.andThen(WriteFeedbackFlow.WriteFeedbackPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackStartNow.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackStartNow.schema),
      Effect.andThen(WriteFeedbackFlow.StartNow),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackEnterFeedback.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackEnterFeedback.schema),
      Effect.andThen(WriteFeedbackFlow.EnterFeedbackPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteFeedbackEnterFeedback.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackEnterFeedback.schema),
      Effect.bind('body', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const form = yield* request.urlParamsBody

          return Record.fromEntries(form)
        }),
      ),
      Effect.andThen(WriteFeedbackFlow.EnterFeedbackSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackChoosePersona.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackChoosePersona.schema),
      Effect.andThen(WriteFeedbackFlow.ChoosePersonaPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteFeedbackChoosePersona.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackChoosePersona.schema),
      Effect.bind('body', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const form = yield* request.urlParamsBody

          return Record.fromEntries(form)
        }),
      ),
      Effect.andThen(WriteFeedbackFlow.ChoosePersonaSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackCodeOfConduct.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackCodeOfConduct.schema),
      Effect.andThen(WriteFeedbackFlow.CodeOfConductPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteFeedbackCodeOfConduct.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackCodeOfConduct.schema),
      Effect.bind('body', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const form = yield* request.urlParamsBody

          return Record.fromEntries(form)
        }),
      ),
      Effect.andThen(WriteFeedbackFlow.CodeOfConductSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackCheck.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackCheck.schema),
      Effect.andThen(WriteFeedbackFlow.CheckPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteFeedbackCheck.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackCheck.schema),
      Effect.andThen(WriteFeedbackFlow.CheckPageSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackPublishing.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackPublishing.schema),
      Effect.andThen(WriteFeedbackFlow.PublishingPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackPublished.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackPublished.schema),
      Effect.andThen(WriteFeedbackFlow.PublishedPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.use(
    HttpMiddleware.make(
      Effect.andThen(HttpServerResponse.setHeaders({ 'Cache-Control': 'no-cache, private', Vary: 'Cookie' })),
    ),
  ),
  HttpRouter.use(logRequest),
  HttpRouter.get(
    '/health',
    Effect.gen(function* () {
      const maybeRedis = yield* Effect.serviceOption(Redis)

      if (Option.isNone(maybeRedis)) {
        return yield* HttpServerResponse.json({ status: 'ok' })
      }

      const redis = maybeRedis.value

      if (redis.status !== 'ready') {
        yield* Effect.fail(new Error(`Redis not ready (${redis.status})`))
      }

      yield* Effect.tryPromise({ try: () => redis.ping(), catch: identity })

      return yield* HttpServerResponse.json({ status: 'ok' })
    }).pipe(
      Effect.catchAll(error =>
        Effect.gen(function* () {
          const asError = error instanceof Error ? error : new Error(String(error))
          yield* Effect.logError('healthcheck failed').pipe(
            Effect.annotateLogs({ message: asError.message, name: asError.name }),
          )

          return yield* HttpServerResponse.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE })
        }),
      ),
      HttpMiddleware.withLoggerDisabled,
    ),
  ),
  HttpRouter.get('/robots.txt', HttpServerResponse.text('User-agent: *\nAllow: /')),
)

function toHttpServerResponse(
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse | RedirectResponse,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, Locale | TemplatePage> {
  return Effect.gen(function* () {
    if (response._tag === 'RedirectResponse') {
      return yield* HttpServerResponse.empty({
        status: response.status,
        headers: Headers.fromInput({ Location: response.location.toString() }),
      })
    }

    const locale = yield* Locale
    const templatePage = yield* TemplatePage
    const user = yield* Effect.serviceOption(LoggedInUser)

    return yield* pipe(
      templatePage(
        toPage({
          locale,
          response,
          user: Option.getOrUndefined(user),
        }),
      ).toString(),
      HttpServerResponse.html,
    )
  })
}
