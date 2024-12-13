import {
  Cookies,
  Headers,
  type HttpMethod,
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform'
import { Effect, identity, Option, pipe, Record } from 'effect'
import { format } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import { AboutUsPage } from './AboutUsPage/index.js'
import { ExpressConfig, FlashMessage, Locale } from './Context.js'
import { PublicUrl } from './public-url.js'
import { Redis } from './Redis.js'
import {
  type FlashMessageResponse,
  type LogInResponse,
  type PageResponse,
  type RedirectResponse,
  type StreamlinePageResponse,
  toPage,
  type TwoUpPageResponse,
} from './response.js'
import * as Routes from './routes.js'
import { TemplatePage } from './TemplatePage.js'
import { LoggedInUser } from './user.js'
import * as WriteCommentFlow from './WriteCommentFlow/index.js'

const MakeRoute = <E, R>(
  method: HttpMethod.HttpMethod,
  path: `/${string}`,
  handler: Effect.Effect<
    PageResponse | StreamlinePageResponse | TwoUpPageResponse | RedirectResponse | LogInResponse | FlashMessageResponse,
    E,
    R
  >,
) => HttpRouter.makeRoute(method, path, Effect.andThen(handler, toHttpServerResponse))

const WriteCommentFlowRouter = HttpRouter.fromIterable([
  MakeRoute(
    'GET',
    Routes.WriteComment.path,
    pipe(HttpRouter.schemaParams(Routes.WriteComment.schema), Effect.andThen(WriteCommentFlow.WriteCommentPage)),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentStartNow.path,
    pipe(HttpRouter.schemaParams(Routes.WriteCommentStartNow.schema), Effect.andThen(WriteCommentFlow.StartNow)),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentEnterComment.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentEnterComment.schema),
      Effect.andThen(WriteCommentFlow.EnterCommentPage),
    ),
  ),
  MakeRoute(
    'POST',
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
    ),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentChoosePersona.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentChoosePersona.schema),
      Effect.andThen(WriteCommentFlow.ChoosePersonaPage),
    ),
  ),
  MakeRoute(
    'POST',
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
    ),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentCompetingInterests.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCompetingInterests.schema),
      Effect.andThen(WriteCommentFlow.CompetingInterestsPage),
    ),
  ),
  MakeRoute(
    'POST',
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
    ),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentCodeOfConduct.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCodeOfConduct.schema),
      Effect.andThen(WriteCommentFlow.CodeOfConductPage),
    ),
  ),
  MakeRoute(
    'POST',
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
    ),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentEnterEmailAddress.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentEnterEmailAddress.schema),
      Effect.andThen(WriteCommentFlow.EnterEmailAddressPage),
    ),
  ),
  MakeRoute(
    'POST',
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
    ),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentNeedToVerifyEmailAddress.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentNeedToVerifyEmailAddress.schema),
      Effect.andThen(WriteCommentFlow.NeedToVerifyEmailAddressPage),
    ),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentVerifyEmailAddress.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentVerifyEmailAddress.schema),
      Effect.andThen(WriteCommentFlow.VerifyEmailAddress),
    ),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentCheck.path,
    pipe(HttpRouter.schemaParams(Routes.WriteCommentCheck.schema), Effect.andThen(WriteCommentFlow.CheckPage)),
  ),
  MakeRoute(
    'POST',
    Routes.WriteCommentCheck.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentCheck.schema),
      Effect.andThen(WriteCommentFlow.CheckPageSubmission),
    ),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentPublishing.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteCommentPublishing.schema),
      Effect.andThen(WriteCommentFlow.PublishingPage),
    ),
  ),
  MakeRoute(
    'GET',
    Routes.WriteCommentPublished.path,
    pipe(HttpRouter.schemaParams(Routes.WriteCommentPublished.schema), Effect.andThen(WriteCommentFlow.PublishedPage)),
  ),
])

export const Router = pipe(
  HttpRouter.fromIterable([MakeRoute('GET', Routes.AboutUs, AboutUsPage)]),
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
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, Locale | TemplatePage | ExpressConfig | PublicUrl> {
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
      const publicUrl = yield* PublicUrl

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
}): Effect.Effect<URL, never, ExpressConfig | PublicUrl> {
  return Effect.gen(function* () {
    const { orcidOauth } = yield* ExpressConfig
    const publicUrl = yield* PublicUrl

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
