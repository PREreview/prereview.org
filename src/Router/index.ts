import {
  type HttpMethod,
  HttpMiddleware,
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform'
import { Effect, Either, flow, identity, Option, pipe, Record, Tuple } from 'effect'
import { Route } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import { AboutUsPage } from '../AboutUsPage/index.js'
import { routerWithoutHyperTs } from '../app-router.js'
import { ClubsPage } from '../ClubsPage.js'
import { CodeOfConductPage } from '../CodeOfConductPage.js'
import { Locale } from '../Context.js'
import { EdiaStatementPage } from '../EdiaStatementPage.js'
import * as FptsToEffect from '../FptsToEffect.js'
import { FundingPage } from '../FundingPage.js'
import { HowToUsePage } from '../HowToUsePage.js'
import { LiveReviewsPage } from '../LiveReviewsPage.js'
import type { OrcidOauth } from '../OrcidOauth.js'
import { PeoplePage } from '../PeoplePage.js'
import { PrivacyPolicyPage } from '../PrivacyPolicyPage.js'
import type { PublicUrl } from '../public-url.js'
import { DataStoreRedis } from '../Redis.js'
import { ResourcesPage } from '../ResourcesPage.js'
import type {
  FlashMessageResponse,
  LogInResponse,
  PageResponse,
  RedirectResponse,
  StreamlinePageResponse,
  TwoUpPageResponse,
} from '../response.js'
import * as Routes from '../routes.js'
import type { TemplatePage } from '../TemplatePage.js'
import { TrainingsPage } from '../TrainingsPage.js'
import * as WriteCommentFlow from '../WriteCommentFlow/index.js'
import { LegacyRouter } from './LegacyRouter.js'
import * as Response from './Response.js'

export type { PageUrls } from './ConstructPageUrls.js'

const MakeRoute = <A, E, R>(
  method: HttpMethod.HttpMethod,
  route: Routes.Route<A>,
  handler: (
    a: A,
  ) => Effect.Effect<
    PageResponse | StreamlinePageResponse | TwoUpPageResponse | RedirectResponse | LogInResponse | FlashMessageResponse,
    E,
    R
  >,
) =>
  HttpRouter.makeRoute(
    method,
    route.path,
    pipe(HttpRouter.schemaParams(route.schema), Effect.andThen(handler), Effect.andThen(Response.toHttpServerResponse)),
  )

const MakeStaticRoute = <E, R>(
  method: HttpMethod.HttpMethod,
  path: `/${string}`,
  handler: Effect.Effect<
    PageResponse | StreamlinePageResponse | TwoUpPageResponse | RedirectResponse | LogInResponse | FlashMessageResponse,
    E,
    R
  >,
) => HttpRouter.makeRoute(method, path, Effect.andThen(handler, Response.toHttpServerResponse))

const WriteCommentFlowRouter = HttpRouter.fromIterable([
  MakeRoute('GET', Routes.WriteComment, WriteCommentFlow.WriteCommentPage),
  MakeRoute('GET', Routes.WriteCommentStartNow, WriteCommentFlow.StartNow),
  MakeRoute('GET', Routes.WriteCommentEnterComment, WriteCommentFlow.EnterCommentPage),
  MakeRoute(
    'POST',
    Routes.WriteCommentEnterComment,
    flow(
      Effect.succeed,
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
  MakeRoute('GET', Routes.WriteCommentChoosePersona, WriteCommentFlow.ChoosePersonaPage),
  MakeRoute(
    'POST',
    Routes.WriteCommentChoosePersona,
    flow(
      Effect.succeed,
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
  MakeRoute('GET', Routes.WriteCommentCompetingInterests, WriteCommentFlow.CompetingInterestsPage),
  MakeRoute(
    'POST',
    Routes.WriteCommentCompetingInterests,
    flow(
      Effect.succeed,
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
  MakeRoute('GET', Routes.WriteCommentCodeOfConduct, WriteCommentFlow.CodeOfConductPage),
  MakeRoute(
    'POST',
    Routes.WriteCommentCodeOfConduct,
    flow(
      Effect.succeed,
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
  MakeRoute('GET', Routes.WriteCommentEnterEmailAddress, WriteCommentFlow.EnterEmailAddressPage),
  MakeRoute(
    'POST',
    Routes.WriteCommentEnterEmailAddress,
    flow(
      Effect.succeed,
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
  MakeRoute('GET', Routes.WriteCommentNeedToVerifyEmailAddress, WriteCommentFlow.NeedToVerifyEmailAddressPage),
  MakeRoute('GET', Routes.WriteCommentVerifyEmailAddress, WriteCommentFlow.VerifyEmailAddress),
  MakeRoute('GET', Routes.WriteCommentCheck, WriteCommentFlow.CheckPage),
  MakeRoute('POST', Routes.WriteCommentCheck, WriteCommentFlow.CheckPageSubmission),
  MakeRoute('GET', Routes.WriteCommentPublishing, WriteCommentFlow.PublishingPage),
  MakeRoute('GET', Routes.WriteCommentPublished, WriteCommentFlow.PublishedPage),
])

const nonEffectHandler: HttpRouter.Route.Handler<
  HttpServerError.RouteNotFound,
  Locale | TemplatePage | OrcidOauth | PublicUrl
> = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest

  const route = yield* Either.try({
    try: () => Route.parse(request.url),
    catch: () => new HttpServerError.RouteNotFound({ request }),
  })

  const locale = yield* Locale
  const env = { locale }

  return yield* pipe(
    FptsToEffect.option(routerWithoutHyperTs.run(route)),
    Option.map(Tuple.getFirst),
    Effect.andThen(readerTask => FptsToEffect.readerTask(readerTask, env)),
    Effect.andThen(Response.toHttpServerResponse),
    Effect.mapError(() => new HttpServerError.RouteNotFound({ request })),
  )
})

const nonEffectRouter: HttpRouter.HttpRouter<
  HttpServerError.RouteNotFound,
  Locale | TemplatePage | OrcidOauth | PublicUrl
> = HttpRouter.fromIterable([HttpRouter.makeRoute('*', '*', nonEffectHandler)])

export const Router = pipe(
  HttpRouter.fromIterable([
    MakeStaticRoute('GET', Routes.AboutUs, AboutUsPage),
    MakeStaticRoute('GET', Routes.Clubs, ClubsPage),
    MakeStaticRoute('GET', Routes.CodeOfConduct, CodeOfConductPage),
    MakeStaticRoute('GET', Routes.EdiaStatement, EdiaStatementPage),
    MakeStaticRoute('GET', Routes.Funding, FundingPage),
    MakeStaticRoute('GET', Routes.HowToUse, HowToUsePage),
    MakeStaticRoute('GET', Routes.LiveReviews, LiveReviewsPage),
    MakeStaticRoute('GET', Routes.People, PeoplePage),
    MakeStaticRoute('GET', Routes.PrivacyPolicy, PrivacyPolicyPage),
    MakeStaticRoute('GET', Routes.Resources, ResourcesPage),
    MakeStaticRoute('GET', Routes.Trainings, TrainingsPage),
  ]),
  HttpRouter.concat(WriteCommentFlowRouter),
  HttpRouter.use(
    HttpMiddleware.make(
      Effect.andThen(HttpServerResponse.setHeaders({ 'Cache-Control': 'no-cache, private', Vary: 'Cookie' })),
    ),
  ),
  HttpRouter.get(
    '/health',
    Effect.gen(function* () {
      const maybeRedis = yield* Effect.serviceOption(DataStoreRedis)

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
  HttpRouter.concat(LegacyRouter),
  HttpRouter.concat(nonEffectRouter),
)
