import { Headers, HttpMiddleware, HttpRouter, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, identity, Option, pipe, Record } from 'effect'
import { format } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import { ExpressConfig, Locale, LoggedInUser, Redis } from './Context.js'
import {
  type LogInResponse,
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
    Routes.WriteComment.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteComment.schema),
      Effect.andThen(WriteFeedbackFlow.WriteFeedbackPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentStartNow.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentStartNow.schema),
      Effect.andThen(WriteFeedbackFlow.StartNow),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentEnterComment.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentEnterComment.schema),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.EnterFeedbackPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteCommentEnterComment.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentEnterComment.schema),
      Effect.bind('body', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const form = yield* request.urlParamsBody

          return Record.fromEntries(form)
        }),
      ),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.EnterFeedbackSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentChoosePersona.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentChoosePersona.schema),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.ChoosePersonaPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteCommentChoosePersona.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentChoosePersona.schema),
      Effect.bind('body', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const form = yield* request.urlParamsBody

          return Record.fromEntries(form)
        }),
      ),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.ChoosePersonaSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentCompetingInterests.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCompetingInterests.schema),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.CompetingInterestsPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteCommentCompetingInterests.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCompetingInterests.schema),
      Effect.bind('body', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const form = yield* request.urlParamsBody

          return Record.fromEntries(form)
        }),
      ),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.CompetingInterestsSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentCodeOfConduct.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCodeOfConduct.schema),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.CodeOfConductPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteCommentCodeOfConduct.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCodeOfConduct.schema),
      Effect.bind('body', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const form = yield* request.urlParamsBody

          return Record.fromEntries(form)
        }),
      ),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.CodeOfConductSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentCheck.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCheck.schema),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.CheckPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteCommentCheck.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCheck.schema),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.CheckPageSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentPublishing.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentPublishing.schema),
      Effect.let('feedbackId', ({ commentId }) => commentId),
      Effect.andThen(WriteFeedbackFlow.PublishingPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentPublished.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentPublished.schema),
      Effect.let('feedbackId', ({ commentId }) => commentId),
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
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse | RedirectResponse | LogInResponse,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, Locale | TemplatePage | ExpressConfig> {
  return Effect.gen(function* () {
    if (response._tag === 'RedirectResponse') {
      return yield* HttpServerResponse.empty({
        status: response.status,
        headers: Headers.fromInput({ Location: response.location.toString() }),
      })
    }

    if (response._tag === 'LogInResponse') {
      const { publicUrl } = yield* ExpressConfig

      const location = yield* generateAuthorizationRequestUrl({
        scope: '/authenticate',
        state: new URL(`${publicUrl.origin}${response.location}`).href,
      })

      return yield* HttpServerResponse.empty({
        status: StatusCodes.MOVED_TEMPORARILY,
        headers: Headers.fromInput({ Location: location.href }),
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

function generateAuthorizationRequestUrl({
  scope,
  state,
}: {
  scope: string
  state?: string
}): Effect.Effect<URL, never, ExpressConfig> {
  return Effect.gen(function* () {
    const { orcidOauth, publicUrl } = yield* ExpressConfig

    const redirectUri = new URL(
      `${publicUrl.origin}${format(Routes.orcidCodeMatch.formatter, { code: 'code', state: 'state' })}`,
    )
    redirectUri.search = ''

    const query = new URLSearchParams({
      client_id: orcidOauth.clientId,
      response_type: 'code',
      redirect_uri: redirectUri.href,
      scope,
    })

    if (typeof state === 'string') {
      query.set('state', state)
    }

    return new URL(`${orcidOauth.authorizeUrl}?${query.toString()}`)
  })
}
