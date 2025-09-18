import { type HttpMethod, HttpRouter, HttpServerError, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, flow, identity, Match, Option, pipe, Record, Struct } from 'effect'
import { AboutUsPage } from '../AboutUsPage/index.js'
import { ChooseLocalePage } from '../ChooseLocalePage/index.js'
import { ClubsPage } from '../ClubsPage.js'
import { CodeOfConductPage } from '../CodeOfConductPage.js'
import { DatasetReviewPage } from '../DatasetReviewPage/index.js'
import { DatasetReviewsPage } from '../DatasetReviewsPage/index.js'
import { EdiaStatementPage } from '../EdiaStatementPage.js'
import { ExpressHttpApp } from '../ExpressHttpApp.js'
import * as FeatureFlags from '../FeatureFlags.js'
import { FundingPage } from '../FundingPage.js'
import { HowToUsePage } from '../HowToUsePage.js'
import * as HttpMiddleware from '../HttpMiddleware/index.js'
import { LiveReviewsPage } from '../LiveReviewsPage.js'
import { LogInDemoUser } from '../LogInDemoUser.js'
import { MenuPage } from '../MenuPage/index.js'
import { PageNotFound } from '../PageNotFound/index.js'
import { PeoplePage } from '../PeoplePage.js'
import { PrivacyPolicyPage } from '../PrivacyPolicyPage.js'
import { DataStoreRedis } from '../Redis.js'
import { ResourcesPage } from '../ResourcesPage.js'
import * as ReviewADatasetFlow from '../ReviewADatasetFlow/index.js'
import * as Routes from '../routes.js'
import * as StatusCodes from '../StatusCodes.js'
import { TrainingsPage } from '../TrainingsPage.js'
import * as WriteCommentFlow from '../WriteCommentFlow/index.js'
import { LegacyRouter } from './LegacyRouter.js'
import { nonEffectRouter } from './NonEffectRouter/index.js'
import * as Response from './Response.js'

export type { PageUrls } from './ConstructPageUrls.js'

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
  MakeStaticRoute('GET', Routes.ReviewThisDatasetStartNow, ReviewADatasetFlow.StartNow),
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
  HttpRouter.append(MakeStaticRoute('GET', Routes.ReviewThisDataset, ReviewADatasetFlow.ReviewThisDatasetPage)),
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
  MakeStaticRoute('GET', Routes.DatasetReviews, DatasetReviewsPage()),
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
    MakeStaticRoute('GET', Routes.Menu, MenuPage),
    MakeStaticRoute('GET', Routes.People, PeoplePage),
    MakeStaticRoute('GET', Routes.PrivacyPolicy, PrivacyPolicyPage),
    MakeStaticRoute('GET', Routes.Resources, ResourcesPage),
    MakeStaticRoute('GET', Routes.Trainings, TrainingsPage),
  ]),
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
  HttpRouter.get('/robots.txt', HttpServerResponse.text('User-agent: *\nAllow: /')),
  HttpRouter.concat(LegacyRouter),
  Effect.catchTag('RouteNotFound', () => Effect.interruptible(nonEffectRouter)),
  Effect.catchTag('RouteNotFound', () => Effect.interruptible(ExpressHttpApp)),
  Effect.catchTag('RouteNotFound', () =>
    Effect.interruptible(Effect.andThen(PageNotFound, Response.toHttpServerResponse)),
  ),
)
