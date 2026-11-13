import {
  FetchHttpClient,
  Headers,
  type HttpClient,
  HttpMethod,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/http'
import { Effect, flow, Match, Option, pipe, Record, type Context, String, Struct, Tuple } from 'effect'
import type { WorkflowEngine } from 'effect/workflow'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type { LoggerEnv } from 'logger-fp-ts'
import type * as AuthorInviteStore from '../../../AuthorInviteStore.ts'
import type * as CachingHttpClient from '../../../CachingHttpClient/index.ts'
import type { Clubs } from '../../../Domain/Clubs/index.ts'
import type { ContactEmailAddresses } from '../../../Domain/ContactEmailAddresses/index.ts'
import { type EnabledLocales, Locale, ScietyListToken, type SessionStore } from '../../../Context.ts'
import { MakeDeprecatedLoggerEnv } from '../../../DeprecatedServices.ts'
import { Zenodo } from '../../../ExternalApis/index.ts'
import {
  type CloudinaryAvatars,
  CommunitySlack,
  type Email,
  type LanguageDetection,
  type OpenAlexWorks,
} from '../../../ExternalInteractions/index.ts'
import * as FeatureFlags from '../../../FeatureFlags.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import { OrcidOauth } from '../../../OrcidOauth.ts'
import type * as OrcidTokens from '../../../OrcidTokens.ts'
import * as SlackUserIds from '../../../SlackUserIds.ts'
import type * as UserOnboardingStore from '../../../UserOnboardingStore.ts'
import * as PreprintReviews from '../../../Domain/PreprintReviews/index.ts'
import type * as Preprints from '../../../Domain/Preprints/index.ts'
import * as Prereviewers from '../../../Domain/Prereviewers/index.ts'
import * as Prereviews from '../../../Domain/Prereviews/index.ts'
import { PublicUrl } from '../../../public-url.ts'
import { EffectToFpts, FptsToEffect } from '../../../RefactoringUtilities/index.ts'
import type * as ReviewRequests from '../../../Domain/ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { SlackOauth } from '../../../SlackOauth.ts'
import type { SpotlightBanners } from '../../../SpotlightBanners/index.ts'
import type { GenerateUuid } from '../../../types/Uuid.ts'
import { LoggedInUser, SessionId, type User } from '../../../user.ts'
import { myPrereviews } from '../../my-prereviews-page/index.ts'
import { preprintReviews } from '../../preprint-reviews-page/index.ts'
import { profile } from '../../profile-page/index.ts'
import * as Response from '../../Response/index.ts'
import { reviewAPreprint } from '../../review-a-preprint-page/index.ts'
import { CommentsForReview, reviewPage } from '../../review-page/index.ts'
import { reviewsPage } from '../../reviews-page/index.ts'
import type { TemplatePage } from '../../TemplatePage.ts'
import { AuthorInviteFlowRouter } from './AuthorInviteFlowRouter.ts'
import { DataRouter } from './DataRouter.ts'
import { withLegacyReadErrors } from './LegacyStoreErrors.ts'
import { MyDetailsRouter } from './MyDetailsRouter.ts'
import { WriteReviewRouter } from './WriteReviewRouter.ts'
import type { AuthorInvites } from '../../../Domain/AuthorInvites/index.ts'

export const nonEffectRouter: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  HttpServerError.RouteNotFound | HttpServerError.HttpServerError,
  | Locale
  | FeatureFlags.FeatureFlags
  | CommentsForReview
  | SlackOauth
  | PreprintReviews.FormStore.Store
  | ScietyListToken
  | SessionStore
  | EffectToFpts.ContextServices<Env['runtime']>
> = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest

  if (request.url.includes('//')) {
    return yield* new HttpServerError.RouteNotFound({ request })
  }

  const route = yield* Effect.try({
    try: () => P.Route.parse(request.url),
    catch: () => new HttpServerError.RouteNotFound({ request }),
  })

  const handler = yield* pipe(
    Effect.fromOption(FptsToEffect.option(routerWithoutHyperTs.run(route))),
    Effect.mapBoth({
      onSuccess: Tuple.get(0),
      onFailure: () => new HttpServerError.RouteNotFound({ request }),
    }),
  )

  const runtime = yield* Effect.context<EffectToFpts.ContextServices<Env['runtime']>>()
  const fetch = yield* FetchHttpClient.Fetch
  const publicUrl = yield* PublicUrl

  const locale = yield* Locale
  const loggedInUser = yield* Effect.serviceOption(LoggedInUser)
  const sessionId = yield* Effect.serviceOption(SessionId)

  const scietyListToken = yield* ScietyListToken
  const orcidOauth = yield* OrcidOauth
  const slackOauth = yield* SlackOauth
  const zenodoApi = yield* Zenodo.ZenodoApi
  const featureFlags = yield* FeatureFlags.FeatureFlags

  const commentsForReview = yield* CommentsForReview
  const body = yield* Effect.suspend(() =>
    HttpMethod.hasBody(request.method)
      ? pipe(
          Match.value(Option.getOrElse(Headers.get(request.headers, 'Content-Type'), () => 'application/octet-stream')),
          Match.when(String.includes('application/x-www-form-urlencoded'), () =>
            Effect.map(request.urlParamsBody, Record.fromEntries),
          ),
          Match.orElse(() => Effect.void),
        )
      : Effect.void,
  )

  const loggerEnv = yield* MakeDeprecatedLoggerEnv

  const env = {
    authorizationHeader: Option.getOrUndefined(Headers.get(request.headers, 'Authorization')),
    body,
    commentsForReview,
    locale,
    loggedInUser: Option.getOrUndefined(loggedInUser),
    sessionId: Option.getOrUndefined(sessionId),
    featureFlags,
    method: request.method as HttpMethod.HttpMethod,
    runtime,
    logger: loggerEnv,
    fetch,
    publicUrl,
    orcidOauth,
    slackOauth,
    scietyListToken,
    zenodoApiConfig: zenodoApi,
  } satisfies Env

  return yield* Effect.map(
    handler(env),
    HttpServerResponse.setHeaders({ 'Cache-Control': 'no-cache, private', Vary: 'Cookie' }),
  )
}).pipe(Effect.withSpan('NonEffectRouter'))

export interface Env {
  authorizationHeader?: string
  body: unknown
  commentsForReview: typeof CommentsForReview.Service
  locale: SupportedLocale
  loggedInUser: User | undefined
  sessionId?: string
  featureFlags: typeof FeatureFlags.FeatureFlags.Service
  publicUrl: typeof PublicUrl.Service
  method: HttpMethod.HttpMethod
  runtime: Context.Context<
    | AuthorInvites
    | Clubs
    | CachingHttpClient.HttpCache
    | CloudinaryAvatars.CloudinaryAvatars
    | CommunitySlack.CommunitySlack
    | ContactEmailAddresses
    | GenerateUuid
    | HttpClient.HttpClient
    | HttpServerRequest.HttpServerRequest
    | LanguageDetection.LanguageDetection
    | OpenAlexWorks.OpenAlexWorks
    | OrcidOauth
    | PreprintReviews.FormStore.Store
    | PreprintReviews.PreprintReviews
    | Preprints.Preprints
    | Prereviewers.Prereviewers
    | Prereviewers.CareerStages.Store
    | Prereviewers.IsOpenForRequestsStore.Store
    | Prereviewers.LanguagesStore.Store
    | Prereviewers.Locations.Store
    | Prereviewers.ResearchInterestsStore.Store
    | Prereviewers.Avatars.Store
    | AuthorInviteStore.Store
    | OrcidTokens.Store
    | SlackUserIds.Store
    | UserOnboardingStore.Store
    | Prereviews.Prereviews
    | PublicUrl
    | SessionStore
    | SpotlightBanners
    | TemplatePage
    | ReviewRequests.ReviewRequests
    | ReviewRequests.ReviewRequestCommands
    | ReviewRequests.ReviewRequestQueries
    | WorkflowEngine.WorkflowEngine
    | Zenodo.ZenodoApi
    | FeatureFlags.FeatureFlags
    | Locale
    | EnabledLocales
    | Email.Email
  >
  logger: LoggerEnv
  orcidOauth: typeof OrcidOauth.Service
  scietyListToken: typeof ScietyListToken.Service
  slackOauth: typeof SlackOauth.Service
  zenodoApiConfig: typeof Zenodo.ZenodoApi.Service
  fetch: typeof globalThis.fetch
}

const routerWithoutHyperTs = pipe(
  [
    pipe(
      Routes.myPrereviewsMatch.parser,
      P.map(
        () => (env: Env) =>
          myPrereviews({ locale: env.locale, user: env.loggedInUser })({
            getMyPrereviews: EffectToFpts.toTaskEitherK(
              flow(
                Prereviews.getForUser,
                Effect.catchTag('PrereviewsAreUnavailable', () => Effect.fail('unavailable' as const)),
              ),
              env.runtime,
            ),
            runtime: env.runtime,
          }),
      ),
    ),
    pipe(
      Routes.preprintReviewsMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            preprintReviews({ id, locale: env.locale })({
              getPrereviews: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviews.getForPreprint,
                  Effect.catchTag('PrereviewsAreUnavailable', () => Effect.fail('unavailable' as const)),
                ),
                env.runtime,
              ),
              getRapidPrereviews: EffectToFpts.toTaskEitherK(
                flow(
                  PreprintReviews.getRapidPrereviewsForAPreprint,
                  Effect.catchTag('UnableToQuery', () => Effect.fail('unavailable' as const)),
                ),
                env.runtime,
              ),
              runtime: env.runtime,
            }),
      ),
    ),
    pipe(
      Routes.profileMatch.parser,
      P.map(
        ({ profile: id }) =>
          (env: Env) =>
            profile({ locale: env.locale, profile: id })({
              getAvatar: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviewers.Avatars.get,
                  Effect.catchTags({
                    AvatarNotFound: () => Effect.fail('not-found' as const),
                    AvatarUnavailable: () => Effect.fail('unavailable' as const),
                  }),
                ),
                env.runtime,
              ),
              getCareerStage: EffectToFpts.toTaskEitherK(
                withLegacyReadErrors(Prereviewers.CareerStages.get),
                env.runtime,
              ),
              getLanguages: EffectToFpts.toTaskEitherK(
                withLegacyReadErrors(Prereviewers.LanguagesStore.get),
                env.runtime,
              ),
              getLocation: EffectToFpts.toTaskEitherK(withLegacyReadErrors(Prereviewers.Locations.get), env.runtime),
              getName: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviewers.getPublicPersona,
                  Effect.map(Struct.get('name')),
                  Effect.map(Option.getOrUndefined),
                  Effect.catchTag('UnableToGetPersona', () => Effect.fail('unavailable' as const)),
                ),
                env.runtime,
              ),
              getPrereviews: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviews.getForProfile,
                  Effect.catchTag('PrereviewsAreUnavailable', () => Effect.fail('unavailable' as const)),
                ),
                env.runtime,
              ),
              getResearchInterests: EffectToFpts.toTaskEitherK(
                withLegacyReadErrors(Prereviewers.ResearchInterestsStore.get),
                env.runtime,
              ),
              getSlackUser: EffectToFpts.toTaskEitherK(
                flow(
                  SlackUserIds.get,
                  Effect.andThen(({ userId }) =>
                    Effect.mapError(CommunitySlack.getSlackUser(userId), () => 'unavailable' as const),
                  ),
                ),
                env.runtime,
              ),
              isOpenForRequests: EffectToFpts.toTaskEitherK(
                withLegacyReadErrors(Prereviewers.IsOpenForRequestsStore.get),
                env.runtime,
              ),
              runtime: env.runtime,
            }),
      ),
    ),
    pipe(
      Routes.reviewAPreprintMatch.parser,
      P.map(
        () => (env: Env) =>
          reviewAPreprint({ body: env.body, method: env.method, locale: env.locale })({ runtime: env.runtime }),
      ),
    ),
    pipe(
      Routes.reviewMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            reviewPage({ id, locale: env.locale })({
              getComments: EffectToFpts.toTaskEitherK(env.commentsForReview.get, env.runtime),
              getPrereview: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviews.getPreprintReview,
                  Effect.catchTags({
                    PrereviewIsNotFound: () => Effect.fail('not-found' as const),
                    PrereviewIsUnavailable: () => Effect.fail('unavailable' as const),
                    PrereviewWasRemoved: () => Effect.fail('removed' as const),
                  }),
                ),
                env.runtime,
              ),
            }),
      ),
    ),
    pipe(
      Routes.reviewsMatch.parser,
      P.map(
        ({ field, language, page, query }) =>
          (env: Env) =>
            reviewsPage({ field, language, locale: env.locale, page: page ?? 1, query })({
              getRecentPrereviews: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviews.search,
                  Effect.catchTags({
                    PrereviewsPageNotFound: () => Effect.fail('not-found' as const),
                    PrereviewsAreUnavailable: () => Effect.fail('unavailable' as const),
                  }),
                ),
                env.runtime,
              ),
            }),
      ),
    ),
    AuthorInviteFlowRouter,
    MyDetailsRouter,
    WriteReviewRouter,
  ],
  concatAll(P.getParserMonoid()),
  P.map(handler => flow(FptsToEffect.taskK(handler), Effect.andThen(Response.toHttpServerResponse))),
  P.alt(() => DataRouter),
) satisfies P.Parser<(env: Env) => Effect.Effect<HttpServerResponse.HttpServerResponse, never, unknown>>
