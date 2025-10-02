import { type HttpMethod, HttpRouter, HttpServerError, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, flow, identity, Match, Option, pipe, Record, Schema, Struct } from 'effect'
import { AboutUsPage } from '../AboutUsPage/index.ts'
import { ChooseLocalePage } from '../ChooseLocalePage/index.ts'
import { ClubsPage } from '../ClubsPage.ts'
import { CodeOfConductPage } from '../CodeOfConductPage.ts'
import { AllowSiteCrawlers, Locale } from '../Context.ts'
import { DatasetReviewPage } from '../DatasetReviewPage/index.ts'
import { DatasetReviewsPage } from '../DatasetReviewsPage/index.ts'
import { EdiaStatementPage } from '../EdiaStatementPage.ts'
import * as FeatureFlags from '../FeatureFlags.ts'
import { FundingPage } from '../FundingPage.ts'
import { HowToUsePage } from '../HowToUsePage.ts'
import * as HttpMiddleware from '../HttpMiddleware/index.ts'
import { LiveReviewsPage } from '../LiveReviewsPage.ts'
import { authenticate, authenticateError, logIn, LogOut } from '../log-in/index.ts'
import { LogInDemoUser } from '../LogInDemoUser.ts'
import { MenuPage } from '../MenuPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import { PeoplePage } from '../PeoplePage.ts'
import { PrivacyPolicyPage } from '../PrivacyPolicyPage.ts'
import { DataStoreRedis } from '../Redis.ts'
import { ResourcesPage } from '../ResourcesPage.ts'
import * as ReviewADatasetFlow from '../ReviewADatasetFlow/index.ts'
import * as Routes from '../routes.ts'
import * as StatusCodes from '../StatusCodes.ts'
import { TrainingsPage } from '../TrainingsPage.ts'
import * as WriteCommentFlow from '../WriteCommentFlow/index.ts'
import { LegacyRouter } from './LegacyRouter.ts'
import { nonEffectRouter } from './NonEffectRouter/index.ts'
import * as Response from './Response.ts'

export type { PageUrls } from './ConstructPageUrls.ts'

const MakeRoute = <A, E, R>(
  method: HttpMethod.HttpMethod,
  route: Routes.Route<A>,
  handler: (a: A) => Effect.Effect<Response.Response, E, R>,
) =>
  HttpRouter.makeRoute(
    method,
    route.path,
    pipe(
      HttpRouter.schemaParams(route.schema),
      Effect.catchTag('ParseError', () =>
        Effect.andThen(HttpServerRequest.HttpServerRequest, request => new HttpServerError.RouteNotFound({ request })),
      ),
      Effect.andThen(handler),
      Effect.andThen(Response.toHttpServerResponse),
    ),
  )

const MakeStaticRoute = <E, R>(
  method: HttpMethod.HttpMethod,
  path: `/${string}`,
  handler: Effect.Effect<Response.Response, E, R>,
) => HttpRouter.makeRoute(method, path, Effect.andThen(handler, Response.toHttpServerResponse))

const ReviewADatasetFlowRouter = HttpRouter.fromIterable([
  MakeRoute('GET', Routes.ReviewThisDatasetStartNow, ReviewADatasetFlow.StartNow),
  MakeRoute(
    'GET',
    Routes.ReviewADatasetFollowsFairAndCarePrinciples,
    ReviewADatasetFlow.FollowsFairAndCarePrinciplesQuestion,
  ),
  MakeRoute('GET', Routes.ReviewADatasetRateTheQuality, ReviewADatasetFlow.RateTheQualityQuestion),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetRateTheQuality,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.RateTheQualitySubmission),
    ),
  ),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetFollowsFairAndCarePrinciples,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.FollowsFairAndCarePrinciplesSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetHasEnoughMetadata, ReviewADatasetFlow.HasEnoughMetadataQuestion),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetHasEnoughMetadata,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.HasEnoughMetadataSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetHasTrackedChanges, ReviewADatasetFlow.HasTrackedChangesQuestion),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetHasTrackedChanges,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.HasTrackedChangesSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetHasDataCensoredOrDeleted, ReviewADatasetFlow.HasDataCensoredOrDeletedQuestion),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetHasDataCensoredOrDeleted,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.HasDataCensoredOrDeletedSubmission),
    ),
  ),
  MakeRoute(
    'GET',
    Routes.ReviewADatasetIsAppropriateForThisKindOfResearch,
    ReviewADatasetFlow.IsAppropriateForThisKindOfResearchQuestion,
  ),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetIsAppropriateForThisKindOfResearch,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.IsAppropriateForThisKindOfResearchSubmission),
    ),
  ),
  MakeRoute(
    'GET',
    Routes.ReviewADatasetSupportsRelatedConclusions,
    ReviewADatasetFlow.SupportsRelatedConclusionsQuestion,
  ),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetSupportsRelatedConclusions,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.SupportsRelatedConclusionsSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetIsDetailedEnough, ReviewADatasetFlow.IsDetailedEnoughQuestion),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetIsDetailedEnough,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.IsDetailedEnoughSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetIsErrorFree, ReviewADatasetFlow.IsErrorFreeQuestion),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetIsErrorFree,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.IsErrorFreeSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetMattersToItsAudience, ReviewADatasetFlow.MattersToItsAudienceQuestion),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetMattersToItsAudience,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.MattersToItsAudienceSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetIsReadyToBeShared, ReviewADatasetFlow.IsReadyToBeSharedQuestion),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetIsReadyToBeShared,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.IsReadyToBeSharedSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetIsMissingAnything, ReviewADatasetFlow.IsMissingAnythingQuestion),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetIsMissingAnything,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.IsMissingAnythingSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetChooseYourPersona, ReviewADatasetFlow.ChooseYourPersonaPage),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetChooseYourPersona,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.ChooseYourPersonaSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetDeclareCompetingInterests, ReviewADatasetFlow.DeclareCompetingInterestsPage),
  MakeRoute(
    'POST',
    Routes.ReviewADatasetDeclareCompetingInterests,
    flow(
      Effect.succeed,
      Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
      Effect.andThen(ReviewADatasetFlow.DeclareCompetingInterestsSubmission),
    ),
  ),
  MakeRoute('GET', Routes.ReviewADatasetCheckYourReview, ReviewADatasetFlow.CheckYourReviewPage),
  MakeRoute('POST', Routes.ReviewADatasetCheckYourReview, ReviewADatasetFlow.CheckYourReviewSubmission),
  MakeRoute('GET', Routes.ReviewADatasetReviewBeingPublished, ReviewADatasetFlow.ReviewBeingPublishedPage),
  MakeRoute('GET', Routes.ReviewADatasetReviewPublished, ReviewADatasetFlow.ReviewPublishedPage),
]).pipe(
  HttpRouter.use(HttpMiddleware.ensureUserIsLoggedIn),
  HttpRouter.append(MakeStaticRoute('GET', Routes.ReviewADataset, ReviewADatasetFlow.ReviewADatasetPage)),
  HttpRouter.append(
    MakeStaticRoute(
      'POST',
      Routes.ReviewADataset,
      pipe(
        Effect.Do,
        Effect.bind('body', () => Effect.andThen(HttpServerRequest.HttpServerRequest, Struct.get('urlParamsBody'))),
        Effect.andThen(ReviewADatasetFlow.ReviewADatasetSubmission),
      ),
    ),
  ),
  HttpRouter.append(MakeRoute('GET', Routes.ReviewThisDataset, ReviewADatasetFlow.ReviewThisDatasetPage)),
  HttpRouter.use(
    HttpMiddleware.make(app =>
      pipe(
        Effect.andThen(FeatureFlags.EnsureCanReviewDatasets, app),
        Effect.catchTag('CannotReviewDatasets', () => Effect.andThen(PageNotFound, Response.toHttpServerResponse)),
      ),
    ),
  ),
)

const DatasetReviewPages = HttpRouter.fromIterable([
  MakeRoute('GET', Routes.DatasetReviews, DatasetReviewsPage),
  MakeRoute('GET', Routes.DatasetReview, DatasetReviewPage),
]).pipe(
  HttpRouter.use(
    HttpMiddleware.make(app =>
      pipe(
        Effect.andThen(FeatureFlags.EnsureCanReviewDatasets, app),
        Effect.catchTag('CannotReviewDatasets', () =>
          Effect.andThen(
            HttpServerRequest.HttpServerRequest,
            request => new HttpServerError.RouteNotFound({ request }),
          ),
        ),
      ),
    ),
  ),
)

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

const AuthRouter = HttpRouter.fromIterable([
  MakeStaticRoute('GET', Routes.LogIn, Effect.succeed(logIn)),
  HttpRouter.makeRoute(
    'GET',
    Routes.LogInDemo,
    Effect.andThen(
      LogInDemoUser,
      flow(
        Match.value,
        Match.tag('ForceLogInResponse', Response.handleForceLogInResponse),
        Match.orElse(Response.toHttpServerResponse),
      ),
    ),
  ),
  HttpRouter.makeRoute('GET', Routes.LogOut, LogOut),
  HttpRouter.makeRoute(
    'GET',
    Routes.OrcidAuth,
    pipe(
      HttpServerRequest.schemaSearchParams(
        Schema.Union(
          Schema.Struct({ code: Schema.String, state: Schema.String }),
          Schema.Struct({ error: Schema.String, state: Schema.String }),
        ),
      ),
      Effect.andThen(
        flow(
          Match.value,
          Match.when({ code: Match.string }, ({ code, state }) =>
            Effect.catchAll(authenticate(code, state), Response.toHttpServerResponse),
          ),
          Match.when({ error: Match.string }, ({ error }) =>
            Effect.andThen(Locale, locale => Response.toHttpServerResponse(authenticateError({ error, locale }))),
          ),
          Match.exhaustive,
        ),
      ),
      Effect.catchTag('ParseError', () =>
        Effect.andThen(HttpServerRequest.HttpServerRequest, request => new HttpServerError.RouteNotFound({ request })),
      ),
    ),
  ),
])

export const Router = pipe(
  HttpRouter.fromIterable([
    MakeStaticRoute('GET', Routes.AboutUs, AboutUsPage),
    MakeStaticRoute('GET', Routes.ChooseLocale, ChooseLocalePage),
    MakeStaticRoute('GET', Routes.Clubs, ClubsPage),
    MakeStaticRoute('GET', Routes.CodeOfConduct, CodeOfConductPage),
    MakeStaticRoute('GET', Routes.EdiaStatement, EdiaStatementPage),
    MakeStaticRoute('GET', Routes.Funding, FundingPage),
    MakeStaticRoute('GET', Routes.HowToUse, HowToUsePage),
    MakeStaticRoute('GET', Routes.LiveReviews, LiveReviewsPage),
    MakeStaticRoute('GET', Routes.Menu, MenuPage),
    MakeStaticRoute('GET', Routes.People, PeoplePage),
    MakeStaticRoute('GET', Routes.PrivacyPolicy, PrivacyPolicyPage),
    MakeStaticRoute('GET', Routes.Resources, ResourcesPage),
    MakeStaticRoute('GET', Routes.Trainings, TrainingsPage),
  ]),
  HttpRouter.concat(AuthRouter),
  HttpRouter.concat(DatasetReviewPages),
  HttpRouter.concat(ReviewADatasetFlowRouter),
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
        return yield* Effect.fail(new Error(`Redis not ready (${redis.status})`))
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

          return yield* HttpServerResponse.json({ status: 'error' }, { status: StatusCodes.ServiceUnavailable })
        }),
      ),
      HttpMiddleware.withLoggerDisabled,
    ),
  ),
  HttpRouter.get(
    '/robots.txt',
    Effect.if(AllowSiteCrawlers, {
      onTrue: () => HttpServerResponse.text('User-agent: *\nAllow: /'),
      onFalse: () => HttpServerResponse.text('User-agent: *\nAllow: /\n\nUser-agent: Amazonbot\nDisallow: /'),
    }),
  ),
  HttpRouter.concat(LegacyRouter),
  Effect.catchTag('RouteNotFound', () => Effect.interruptible(nonEffectRouter)),
  Effect.catchTag('RouteNotFound', () =>
    Effect.interruptible(Effect.andThen(PageNotFound, Response.toHttpServerResponse)),
  ),
)
