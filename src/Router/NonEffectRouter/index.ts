import {
  FetchHttpClient,
  Headers,
  type HttpClient,
  HttpMethod,
  HttpServerError,
  HttpServerRequest,
  type HttpServerResponse,
} from '@effect/platform'
import { Effect, Either, flow, Match, Option, pipe, Record, Redacted, type Runtime, String, Tuple } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as T from 'fp-ts/lib/Task.js'
import type * as CachingHttpClient from '../../CachingHttpClient/index.js'
import { CloudinaryApiConfig, getAvatarFromCloudinary } from '../../cloudinary.js'
import { clubProfile } from '../../club-profile-page/index.js'
import { DeprecatedLoggerEnv, ExpressConfig, Locale } from '../../Context.js'
import * as EffectToFpts from '../../EffectToFpts.js'
import * as FeatureFlags from '../../FeatureFlags.js'
import { withEnv } from '../../Fpts.js'
import * as FptsToEffect from '../../FptsToEffect.js'
import { home } from '../../home-page/index.js'
import * as Keyv from '../../keyv.js'
import type { SupportedLocale } from '../../locales/index.js'
import { myPrereviews } from '../../my-prereviews-page/index.js'
import { Nodemailer } from '../../nodemailer.js'
import type * as OpenAlex from '../../OpenAlex/index.js'
import { getNameFromOrcid } from '../../orcid.js'
import { OrcidOauth } from '../../OrcidOauth.js'
import { partners } from '../../partners.js'
import { preprintReviews } from '../../preprint-reviews-page/index.js'
import * as Preprints from '../../Preprints/index.js'
import { PrereviewCoarNotifyConfig } from '../../prereview-coar-notify/index.js'
import * as Prereviews from '../../Prereviews/index.js'
import { profile } from '../../profile-page/index.js'
import { PublicUrl } from '../../public-url.js'
import { requestAPrereview } from '../../request-a-prereview-page/index.js'
import { reviewAPreprint } from '../../review-a-preprint-page/index.js'
import { CommentsForReview, reviewPage } from '../../review-page/index.js'
import { reviewRequests } from '../../review-requests-page/index.js'
import * as ReviewRequests from '../../ReviewRequests/index.js'
import { reviewsPage } from '../../reviews-page/index.js'
import * as Routes from '../../routes.js'
import { getUserFromSlack, SlackApiConfig } from '../../slack.js'
import type { TemplatePage } from '../../TemplatePage.js'
import type { NonEmptyString } from '../../types/index.js'
import type { GenerateUuid } from '../../types/uuid.js'
import { LoggedInUser, SessionId, type User } from '../../user.js'
import { ZenodoOrigin } from '../../Zenodo/index.js'
import * as Response from '../Response.js'
import { AuthorInviteFlowRouter } from './AuthorInviteFlowRouter.js'
import { DataRouter } from './DataRouter.js'
import { MyDetailsRouter } from './MyDetailsRouter.js'
import { RequestReviewFlowRouter } from './RequestReviewFlowRouter.js'
import { WriteReviewRouter } from './WriteReviewRouter.js'

export const nonEffectRouter: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  HttpServerError.RouteNotFound | HttpServerError.RequestError,
  | HttpServerRequest.HttpServerRequest
  | Locale
  | TemplatePage
  | OrcidOauth
  | PublicUrl
  | FeatureFlags.FeatureFlags
  | CommentsForReview
  | DeprecatedLoggerEnv
  | FetchHttpClient.Fetch
  | ExpressConfig
  | SlackApiConfig
  | CloudinaryApiConfig
  | PrereviewCoarNotifyConfig
  | Nodemailer
  | Runtime.Runtime.Context<Env['runtime']>
> = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest

  if (request.url.includes('//')) {
    return yield* new HttpServerError.RouteNotFound({ request })
  }

  const route = yield* Either.try({
    try: () => P.Route.parse(request.url),
    catch: () => new HttpServerError.RouteNotFound({ request }),
  })

  const handler = yield* pipe(
    FptsToEffect.option(routerWithoutHyperTs.run(route)),
    Effect.mapBoth({
      onSuccess: Tuple.getFirst,
      onFailure: () => new HttpServerError.RouteNotFound({ request }),
    }),
  )

  const expressConfig = yield* ExpressConfig
  const runtime = yield* Effect.runtime<Runtime.Runtime.Context<Env['runtime']>>()
  const logger = yield* DeprecatedLoggerEnv
  const fetch = yield* FetchHttpClient.Fetch
  const publicUrl = yield* PublicUrl
  const nodemailer = yield* Nodemailer

  const locale = yield* Locale
  const loggedInUser = yield* Effect.serviceOption(LoggedInUser)
  const sessionId = yield* Effect.serviceOption(SessionId)

  const slackApiConfig = yield* SlackApiConfig
  const cloudinaryApiConfig = yield* CloudinaryApiConfig
  const prereviewCoarNotifyConfig = yield* PrereviewCoarNotifyConfig
  const orcidOauth = yield* OrcidOauth
  const zenodoOrigin = yield* ZenodoOrigin
  const featureFlags = yield* FeatureFlags.FeatureFlags

  const commentsForReview = yield* CommentsForReview
  const users = {
    avatarStore: expressConfig.avatarStore,
    contactEmailAddressStore: expressConfig.contactEmailAddressStore,
    userOnboardingStore: expressConfig.userOnboardingStore,
    orcidTokenStore: expressConfig.orcidTokenStore,
    slackUserIdStore: expressConfig.slackUserIdStore,
    isOpenForRequestsStore: expressConfig.isOpenForRequestsStore,
    careerStageStore: expressConfig.careerStageStore,
    researchInterestsStore: expressConfig.researchInterestsStore,
    locationStore: expressConfig.locationStore,
    languagesStore: expressConfig.languagesStore,
    authorInviteStore: expressConfig.authorInviteStore,
  }

  const body = yield* Effect.if(HttpMethod.hasBody(request.method), {
    onTrue: () =>
      pipe(
        Match.value(Option.getOrElse(Headers.get(request.headers, 'Content-Type'), () => 'application/octet-stream')),
        Match.when(String.includes('application/x-www-form-urlencoded'), () =>
          Effect.andThen(request.urlParamsBody, Record.fromEntries),
        ),
        Match.orElse(() => Effect.void),
      ),
    onFalse: () => Effect.void,
  })

  const env = {
    authorizationHeader: Option.getOrUndefined(Headers.get(request.headers, 'Authorization')),
    body,
    commentsForReview,
    locale,
    loggedInUser: Option.getOrUndefined(loggedInUser),
    sessionId: Option.getOrUndefined(sessionId),
    featureFlags,
    method: request.method,
    runtime,
    logger,
    fetch,
    publicUrl,
    orcidOauth,
    slackOauth: {
      authorizeUrl: expressConfig.slackOauth.authorizeUrl,
      clientId: expressConfig.slackOauth.clientId,
      clientSecret: Redacted.make(expressConfig.slackOauth.clientSecret),
      tokenUrl: expressConfig.slackOauth.tokenUrl,
    },
    scietyListToken: Redacted.make(expressConfig.scietyListToken),
    slackApiConfig,
    cloudinaryApiConfig,
    orcidApiConfig: {
      url: expressConfig.orcidApiUrl,
      token: typeof expressConfig.orcidApiToken === 'string' ? Redacted.make(expressConfig.orcidApiToken) : undefined,
    },
    zenodoApiConfig: {
      key: Redacted.make(expressConfig.zenodoApiKey),
      origin: zenodoOrigin,
    },
    prereviewCoarNotifyConfig,
    legacyPrereviewApiConfig: {
      app: expressConfig.legacyPrereviewApi.app,
      key: Redacted.make(expressConfig.legacyPrereviewApi.key),
      url: expressConfig.legacyPrereviewApi.url,
      update: expressConfig.legacyPrereviewApi.update,
    },
    users,
    authorInviteStore: expressConfig.authorInviteStore,
    formStore: expressConfig.formStore,
    reviewRequestStore: expressConfig.reviewRequestStore,
    sessionStore: expressConfig.sessionStore,
    nodemailer,
  } satisfies Env

  return yield* handler(env)
})

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
  runtime: Runtime.Runtime<
    | CachingHttpClient.HttpCache
    | GenerateUuid
    | HttpClient.HttpClient
    | OpenAlex.GetCategories
    | Preprints.Preprints
    | PrereviewCoarNotifyConfig
    | Prereviews.Prereviews
    | ReviewRequests.ReviewRequests
    | ZenodoOrigin
  >
  logger: typeof DeprecatedLoggerEnv.Service
  users: {
    userOnboardingStore: Keyv.Keyv
    orcidTokenStore: Keyv.Keyv
    avatarStore: Keyv.Keyv
    contactEmailAddressStore: Keyv.Keyv
    slackUserIdStore: Keyv.Keyv
    isOpenForRequestsStore: Keyv.Keyv
    careerStageStore: Keyv.Keyv
    researchInterestsStore: Keyv.Keyv
    locationStore: Keyv.Keyv
    languagesStore: Keyv.Keyv
  }
  authorInviteStore: Keyv.Keyv
  formStore: Keyv.Keyv
  reviewRequestStore: Keyv.Keyv
  sessionStore: Keyv.Keyv
  orcidOauth: typeof OrcidOauth.Service
  scietyListToken: Redacted.Redacted<NonEmptyString.NonEmptyString>
  slackOauth: {
    authorizeUrl: URL
    clientId: string
    clientSecret: Redacted.Redacted
    tokenUrl: URL
  }
  cloudinaryApiConfig: typeof CloudinaryApiConfig.Service
  orcidApiConfig: {
    url: URL
    token?: Redacted.Redacted
  }
  slackApiConfig: typeof SlackApiConfig.Service
  zenodoApiConfig: {
    key: Redacted.Redacted
    origin: typeof ZenodoOrigin.Service
  }
  prereviewCoarNotifyConfig: typeof PrereviewCoarNotifyConfig.Service
  legacyPrereviewApiConfig: {
    app: string
    key: Redacted.Redacted
    url: URL
    update: boolean
  }
  fetch: typeof globalThis.fetch
  nodemailer: typeof Nodemailer.Service
}

const PaltW: <B>(that: () => P.Parser<B>) => <A>(fa: P.Parser<A>) => P.Parser<A | B> = P.alt as never

const routerWithoutHyperTs = pipe(
  [
    pipe(
      Routes.partnersMatch.parser,
      P.map(() => (env: Env) => T.of(partners(env.locale))),
    ),
    pipe(
      Routes.clubProfileMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            clubProfile(
              id,
              env.locale,
            )({
              getPrereviews: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviews.getForClub,
                  Effect.catchTag('PrereviewsAreUnavailable', () => Effect.fail('unavailable' as const)),
                ),
                env.runtime,
              ),
            }),
      ),
    ),
    pipe(
      Routes.homeMatch.parser,
      P.map(
        () => (env: Env) =>
          home({
            canSeeDesignTweaks: env.featureFlags.canSeeDesignTweaks,
            canSeeHomePageChanges: env.featureFlags.canSeeHomePageChanges(env.loggedInUser),
            locale: env.locale,
          })({
            getRecentPrereviews: () => EffectToFpts.toTask(Prereviews.getFiveMostRecent, env.runtime),
            getRecentReviewRequests: () => EffectToFpts.toTask(ReviewRequests.getFiveMostRecent, env.runtime),
          }),
      ),
    ),
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
          }),
      ),
    ),
    pipe(
      Routes.preprintReviewsMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            preprintReviews({ id, locale: env.locale })({
              getPreprint: EffectToFpts.toTaskEitherK(Preprints.getPreprint, env.runtime),
              getPrereviews: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviews.getForPreprint,
                  Effect.catchTag('PrereviewsAreUnavailable', () => Effect.fail('unavailable' as const)),
                ),
                env.runtime,
              ),
              getRapidPrereviews: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviews.getRapidPrereviewsForPreprint,
                  Effect.catchTag('PrereviewsAreUnavailable', () => Effect.fail('unavailable' as const)),
                ),
                env.runtime,
              ),
            }),
      ),
    ),
    pipe(
      Routes.profileMatch.parser,
      P.map(
        ({ profile: id }) =>
          (env: Env) =>
            profile({ locale: env.locale, profile: id })({
              getAvatar: withEnv(getAvatarFromCloudinary, {
                getCloudinaryAvatar: withEnv(Keyv.getAvatar, { avatarStore: env.users.avatarStore, ...env.logger }),
                cloudinaryApi: {
                  cloudName: env.cloudinaryApiConfig.cloudName,
                  key: Redacted.value(env.cloudinaryApiConfig.key),
                  secret: Redacted.value(env.cloudinaryApiConfig.secret),
                },
              }),
              getCareerStage: withEnv(Keyv.getCareerStage, {
                careerStageStore: env.users.careerStageStore,
                ...env.logger,
              }),
              getLanguages: withEnv(Keyv.getLanguages, {
                languagesStore: env.users.languagesStore,
                ...env.logger,
              }),
              getLocation: withEnv(Keyv.getLocation, {
                locationStore: env.users.locationStore,
                ...env.logger,
              }),
              getName: withEnv(getNameFromOrcid, {
                fetch: env.fetch,
                orcidApiToken: env.orcidApiConfig.token ? Redacted.value(env.orcidApiConfig.token) : undefined,
                orcidApiUrl: env.orcidApiConfig.url,
                ...env.logger,
              }),
              getPrereviews: EffectToFpts.toTaskEitherK(
                flow(
                  Prereviews.getForProfile,
                  Effect.catchTag('PrereviewsAreUnavailable', () => Effect.fail('unavailable' as const)),
                ),
                env.runtime,
              ),
              getResearchInterests: withEnv(Keyv.getResearchInterests, {
                researchInterestsStore: env.users.researchInterestsStore,
                ...env.logger,
              }),
              getSlackUser: withEnv(
                flow(
                  Keyv.getSlackUserId,
                  RTE.chainW(({ userId }) => getUserFromSlack(userId)),
                ),
                {
                  ...env.logger,
                  slackUserIdStore: env.users.slackUserIdStore,
                  slackApiToken: Redacted.value(env.slackApiConfig.apiToken),
                  fetch: env.fetch,
                },
              ),
              isOpenForRequests: withEnv(Keyv.isOpenForRequests, {
                isOpenForRequestsStore: env.users.isOpenForRequestsStore,
                ...env.logger,
              }),
            }),
      ),
    ),
    pipe(
      Routes.requestAPrereviewMatch.parser,
      P.map(
        () => (env: Env) =>
          requestAPrereview({ body: env.body, method: env.method, locale: env.locale })({
            resolvePreprintId: EffectToFpts.toTaskEitherK(Preprints.resolvePreprintId, env.runtime),
          }),
      ),
    ),
    pipe(
      Routes.reviewAPreprintMatch.parser,
      P.map(
        () => (env: Env) =>
          reviewAPreprint({ body: env.body, method: env.method, locale: env.locale })({
            resolvePreprintId: EffectToFpts.toTaskEitherK(Preprints.resolvePreprintId, env.runtime),
          }),
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
                  Prereviews.getPrereview,
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
    pipe(
      Routes.reviewRequestsMatch.parser,
      P.map(
        ({ field, language, page }) =>
          (env: Env) =>
            reviewRequests({ field, language, locale: env.locale, page: page ?? 1 })({
              getReviewRequests: EffectToFpts.toTaskEitherK(ReviewRequests.search, env.runtime),
            }),
      ),
    ),
    AuthorInviteFlowRouter,
    MyDetailsRouter,
    RequestReviewFlowRouter,
    WriteReviewRouter,
  ],
  concatAll(P.getParserMonoid()),
  P.map(handler => flow(FptsToEffect.taskK(handler), Effect.andThen(Response.toHttpServerResponse))),
  PaltW(() => DataRouter),
) satisfies P.Parser<(env: Env) => Effect.Effect<HttpServerResponse.HttpServerResponse, never, unknown>>
