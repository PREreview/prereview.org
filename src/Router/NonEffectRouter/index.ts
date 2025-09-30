import {
  FetchHttpClient,
  FileSystem,
  Headers,
  type HttpClient,
  HttpMethod,
  HttpServerError,
  HttpServerRequest,
  type HttpServerResponse,
  type Path,
} from '@effect/platform'
import {
  Effect,
  Either,
  flow,
  Match,
  Option,
  pipe,
  Record,
  Redacted,
  type Runtime,
  type Scope,
  String,
  Struct,
  Tuple,
} from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as T from 'fp-ts/lib/Task.js'
import type * as CachingHttpClient from '../../CachingHttpClient/index.ts'
import { clubProfile } from '../../club-profile-page/index.ts'
import { DeprecatedLoggerEnv, ExpressConfig, Locale, SessionStore } from '../../Context.ts'
import { AddAnnotationsToLogger } from '../../DeprecatedServices.ts'
import * as EffectToFpts from '../../EffectToFpts.ts'
import { Cloudinary, Slack, Zenodo } from '../../ExternalApis/index.ts'
import * as FeatureFlags from '../../FeatureFlags.ts'
import { withEnv } from '../../Fpts.ts'
import * as FptsToEffect from '../../FptsToEffect.ts'
import { home } from '../../home-page/index.ts'
import * as Keyv from '../../keyv.ts'
import * as LegacyPrereview from '../../legacy-prereview.ts'
import { LegacyPrereviewApi } from '../../legacy-prereview.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { myPrereviews } from '../../my-prereviews-page/index.ts'
import { Nodemailer } from '../../nodemailer.ts'
import type * as OpenAlex from '../../OpenAlex/index.ts'
import { OrcidOauth } from '../../OrcidOauth.ts'
import { partners } from '../../partners.ts'
import * as Personas from '../../Personas/index.ts'
import { preprintReviews } from '../../preprint-reviews-page/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import { PrereviewCoarNotifyConfig } from '../../prereview-coar-notify/index.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import { profile } from '../../profile-page/index.ts'
import { PublicUrl } from '../../public-url.ts'
import { requestAPrereview } from '../../request-a-prereview-page/index.ts'
import { reviewAPreprint } from '../../review-a-preprint-page/index.ts'
import { CommentsForReview, reviewPage } from '../../review-page/index.ts'
import { reviewRequests } from '../../review-requests-page/index.ts'
import * as ReviewRequests from '../../ReviewRequests/index.ts'
import { reviewsPage } from '../../reviews-page/index.ts'
import * as Routes from '../../routes.ts'
import type { TemplatePage } from '../../TemplatePage.ts'
import type { NonEmptyString } from '../../types/index.ts'
import type { GenerateUuid } from '../../types/uuid.ts'
import { LoggedInUser, SessionId, type User } from '../../user.ts'
import * as Response from '../Response.ts'
import { AuthorInviteFlowRouter } from './AuthorInviteFlowRouter.ts'
import { DataRouter } from './DataRouter.ts'
import { legacyRouter } from './legacy-routes.ts'
import { MyDetailsRouter } from './MyDetailsRouter.ts'
import { RequestReviewFlowRouter } from './RequestReviewFlowRouter.ts'
import { WriteReviewRouter } from './WriteReviewRouter.ts'

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
  | Slack.SlackApi
  | Cloudinary.CloudinaryApi
  | SessionStore
  | PrereviewCoarNotifyConfig
  | Nodemailer
  | Runtime.Runtime.Context<Env['runtime']>
  | FileSystem.FileSystem
  | Path.Path
  | Scope.Scope
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
  const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv
  const fetch = yield* FetchHttpClient.Fetch
  const publicUrl = yield* PublicUrl
  const nodemailer = yield* Nodemailer
  const fileSystem = yield* FileSystem.FileSystem

  const locale = yield* Locale
  const loggedInUser = yield* Effect.serviceOption(LoggedInUser)
  const sessionId = yield* Effect.serviceOption(SessionId)

  const slackApiConfig = yield* Slack.SlackApi
  const cloudinaryApiConfig = yield* Cloudinary.CloudinaryApi
  const prereviewCoarNotifyConfig = yield* PrereviewCoarNotifyConfig
  const legacyPrereviewApi = yield* LegacyPrereviewApi
  const orcidOauth = yield* OrcidOauth
  const zenodoApi = yield* Zenodo.ZenodoApi
  const featureFlags = yield* FeatureFlags.FeatureFlags
  const sessionStore = yield* SessionStore

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
        Match.when(String.includes('multipart/form-data'), () => Effect.either(request.multipart)),
        Match.orElse(() => Effect.void),
      ),
    onFalse: () => Effect.void,
  })

  const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

  const env = {
    authorizationHeader: Option.getOrUndefined(Headers.get(request.headers, 'Authorization')),
    body,
    commentsForReview,
    locale,
    loggedInUser: Option.getOrUndefined(loggedInUser),
    sessionId: Option.getOrUndefined(sessionId),
    featureFlags,
    method: request.method,
    fileSystem,
    runtime,
    logger: {
      clock,
      logger,
    },
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
    zenodoApiConfig: zenodoApi,
    prereviewCoarNotifyConfig,
    legacyPrereviewApiConfig: legacyPrereviewApi,
    users,
    authorInviteStore: expressConfig.authorInviteStore,
    formStore: expressConfig.formStore,
    reviewRequestStore: expressConfig.reviewRequestStore,
    sessionStore: sessionStore.store,
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
  fileSystem: FileSystem.FileSystem
  runtime: Runtime.Runtime<
    | CachingHttpClient.HttpCache
    | GenerateUuid
    | HttpClient.HttpClient
    | LegacyPrereviewApi
    | OpenAlex.GetCategories
    | Personas.Personas
    | Preprints.Preprints
    | PrereviewCoarNotifyConfig
    | Prereviews.Prereviews
    | ReviewRequests.ReviewRequests
    | Zenodo.ZenodoApi
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
  cloudinaryApiConfig: typeof Cloudinary.CloudinaryApi.Service
  slackApiConfig: typeof Slack.SlackApi.Service
  zenodoApiConfig: typeof Zenodo.ZenodoApi.Service
  prereviewCoarNotifyConfig: typeof PrereviewCoarNotifyConfig.Service
  legacyPrereviewApiConfig: typeof LegacyPrereviewApi.Service
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
          home({ canReviewDatasets: env.featureFlags.canReviewDatasets, locale: env.locale })({
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
              getAvatar: withEnv(Cloudinary.getAvatarFromCloudinary, {
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
              getName: EffectToFpts.toTaskEitherK(
                flow(
                  Personas.getPublicPersona,
                  Effect.andThen(Struct.get('name')),
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
              getResearchInterests: withEnv(Keyv.getResearchInterests, {
                researchInterestsStore: env.users.researchInterestsStore,
                ...env.logger,
              }),
              getSlackUser: withEnv(
                flow(
                  Keyv.getSlackUserId,
                  RTE.chainW(({ userId }) => Slack.getUserFromSlack(userId)),
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
    pipe(
      legacyRouter,
      P.map(
        R.local((env: Env) => ({
          locale: env.locale,
          getPreprintIdFromUuid: withEnv(LegacyPrereview.getPreprintIdFromLegacyPreviewUuid, {
            fetch: env.fetch,
            legacyPrereviewApi: {
              app: env.legacyPrereviewApiConfig.app,
              key: Redacted.value(env.legacyPrereviewApiConfig.key),
              url: env.legacyPrereviewApiConfig.origin,
              update: env.legacyPrereviewApiConfig.update,
            },
          }),
          getProfileIdFromUuid: withEnv(LegacyPrereview.getProfileIdFromLegacyPreviewUuid, {
            fetch: env.fetch,
            legacyPrereviewApi: {
              app: env.legacyPrereviewApiConfig.app,
              key: Redacted.value(env.legacyPrereviewApiConfig.key),
              url: env.legacyPrereviewApiConfig.origin,
              update: env.legacyPrereviewApiConfig.update,
            },
          }),
        })),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(handler => flow(FptsToEffect.taskK(handler), Effect.andThen(Response.toHttpServerResponse))),
  PaltW(() => DataRouter),
) satisfies P.Parser<(env: Env) => Effect.Effect<HttpServerResponse.HttpServerResponse, never, unknown>>
