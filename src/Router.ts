import { Cookies, Headers, HttpMiddleware, HttpRouter, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, identity, Option, pipe, Record } from 'effect'
import { format } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import { ExpressConfig, FlashMessage, Locale, LoggedInUser, Redis } from './Context.js'
import {
  FlashMessageResponse,
  type LogInResponse,
  type PageResponse,
  type RedirectResponse,
  type StreamlinePageResponse,
  toPage,
  type TwoUpPageResponse,
} from './response.js'
import * as Routes from './routes.js'
import { TemplatePage } from './TemplatePage.js'
import * as WriteCommentFlow from './WriteCommentFlow/index.js'

const WriteCommentFlowRouter = pipe(
  HttpRouter.empty,
  HttpRouter.get(
    Routes.WriteComment.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteComment.schema),
      Effect.andThen(WriteCommentFlow.WriteCommentPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentStartNow.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentStartNow.schema),
      Effect.andThen(WriteCommentFlow.StartNow),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentEnterComment.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentEnterComment.schema),
      Effect.andThen(WriteCommentFlow.EnterCommentPage),
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
      Effect.andThen(WriteCommentFlow.EnterCommentSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentChoosePersona.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentChoosePersona.schema),
      Effect.andThen(WriteCommentFlow.ChoosePersonaPage),
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
      Effect.andThen(WriteCommentFlow.ChoosePersonaSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentCompetingInterests.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCompetingInterests.schema),
      Effect.andThen(WriteCommentFlow.CompetingInterestsPage),
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
      Effect.andThen(WriteCommentFlow.CompetingInterestsSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentCodeOfConduct.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCodeOfConduct.schema),
      Effect.andThen(WriteCommentFlow.CodeOfConductPage),
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
      Effect.andThen(WriteCommentFlow.CodeOfConductSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentEnterEmailAddress.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentEnterEmailAddress.schema),
      Effect.andThen(WriteCommentFlow.EnterEmailAddressPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteCommentEnterEmailAddress.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentEnterEmailAddress.schema),
      Effect.bind('body', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const form = yield* request.urlParamsBody

          return Record.fromEntries(form)
        }),
      ),
      Effect.andThen(WriteCommentFlow.EnterEmailAddressSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentVerifyEmailAddress.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentVerifyEmailAddress.schema),
      Effect.andThen(WriteCommentFlow.VerifyEmailAddress),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentCheck.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCheck.schema),
      Effect.andThen(WriteCommentFlow.CheckPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteCommentCheck.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCheck.schema),
      Effect.andThen(WriteCommentFlow.CheckPageSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentPublishing.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentPublishing.schema),
      Effect.andThen(WriteCommentFlow.PublishingPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteCommentPublished.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentPublished.schema),
      Effect.andThen(WriteCommentFlow.PublishedPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
)

export const Router = pipe(
  HttpRouter.empty,
  HttpRouter.concat(WriteCommentFlowRouter),
  HttpRouter.use(
    HttpMiddleware.make(
      Effect.andThen(HttpServerResponse.setHeaders({ 'Cache-Control': 'no-cache, private', Vary: 'Cookie' })),
    ),
  ),
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
  response:
    | PageResponse
    | StreamlinePageResponse
    | TwoUpPageResponse
    | RedirectResponse
    | LogInResponse
    | FlashMessageResponse,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, Locale | TemplatePage | ExpressConfig> {
  return Effect.gen(function* () {
    if (response._tag === 'RedirectResponse') {
      return yield* HttpServerResponse.empty({
        status: response.status,
        headers: Headers.fromInput({ Location: response.location.toString() }),
      })
    }

    if (response._tag === 'FlashMessageResponse') {
      return yield* HttpServerResponse.empty({
        status: StatusCodes.SEE_OTHER,
        headers: Headers.fromInput({ Location: response.location.toString() }),
        cookies: Cookies.fromIterable([
          Cookies.unsafeMakeCookie('flash-message', response.message, { httpOnly: true, path: '/' }),
        ]),
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
    const message = yield* Effect.serviceOption(FlashMessage)

    return yield* pipe(
      templatePage(
        toPage({
          locale,
          message: Option.getOrUndefined(message),
          response,
          user: Option.getOrUndefined(user),
        }),
      ).toString(),
      HttpServerResponse.html,
      Option.match(message, {
        onNone: () => identity,
        onSome: () =>
          HttpServerResponse.unsafeSetCookie('flash-message', '', { expires: new Date(1), httpOnly: true, path: '/' }),
      }),
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
