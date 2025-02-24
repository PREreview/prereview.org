import { FetchHttpClient } from '@effect/platform'
import KeyvRedis from '@keyv/redis'
import { Duration, Effect, Redacted } from 'effect'
import Keyv from 'keyv'
import { app } from './app.js'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, DeprecatedSleepEnv, ExpressConfig, SessionSecret } from './Context.js'
import * as EffectToFpts from './EffectToFpts.js'
import { CanWriteComments, UseCrowdinInContext } from './feature-flags.js'
import { GhostApi } from './ghost.js'
import { Nodemailer } from './nodemailer.js'
import * as Preprint from './preprint.js'
import { PublicUrl } from './public-url.js'
import { DataStoreRedis } from './Redis.js'
import { TemplatePage } from './TemplatePage.js'
import { GenerateUuid } from './types/uuid.js'

export const expressServer = Effect.gen(function* () {
  const config = yield* ExpressConfig
  const fetch = yield* FetchHttpClient.Fetch
  const { clock } = yield* DeprecatedLoggerEnv
  const sleep = yield* DeprecatedSleepEnv
  const canWriteComments = yield* CanWriteComments
  const nodemailer = yield* Nodemailer
  const publicUrl = yield* PublicUrl
  const generateUuid = yield* Effect.andThen(GenerateUuid, EffectToFpts.makeIO)
  const templatePage = yield* TemplatePage
  const useCrowdinInContext = yield* UseCrowdinInContext
  const ghostApi = yield* GhostApi
  const secret = yield* SessionSecret
  const getPreprint = yield* Effect.andThen(Preprint.GetPreprint, EffectToFpts.makeTaskEitherK)

  return app({
    canWriteComments,
    clock,
    fetch,
    generateUuid,
    getPreprint,
    ghostApi,
    nodemailer,
    publicUrl,
    secret: Redacted.value(secret),
    ...sleep,
    templatePage,
    useCrowdinInContext,
    ...config,
  })
})

export const ExpressConfigLive = Effect.gen(function* () {
  const redis = yield* DataStoreRedis
  const env = yield* DeprecatedEnvVars
  const loggerEnv = yield* DeprecatedLoggerEnv

  const createKeyvStore = () => new KeyvRedis(redis).on('error', () => undefined)

  return {
    ...loggerEnv,
    allowSiteCrawlers: env.ALLOW_SITE_CRAWLERS,
    authorInviteStore: new Keyv({ emitErrors: false, namespace: 'author-invite', store: createKeyvStore() }),
    avatarStore: new Keyv({ emitErrors: false, namespace: 'avatar-store', store: createKeyvStore() }),
    canConnectOrcidProfile: () => true,
    canRequestReviews: () => true,
    canUploadAvatar: () => true,
    canUseSearchQueries: () => true,
    cloudinaryApi: { cloudName: 'prereview', key: env.CLOUDINARY_API_KEY, secret: env.CLOUDINARY_API_SECRET },
    coarNotifyToken: env.COAR_NOTIFY_TOKEN,
    coarNotifyUrl: env.COAR_NOTIFY_URL,
    contactEmailAddressStore: new Keyv({
      emitErrors: false,
      namespace: 'contact-email-address',
      store: createKeyvStore(),
    }),
    formStore: new Keyv({ emitErrors: false, namespace: 'forms', store: createKeyvStore() }),
    careerStageStore: new Keyv({ emitErrors: false, namespace: 'career-stage', store: createKeyvStore() }),
    isOpenForRequestsStore: new Keyv({
      emitErrors: false,
      namespace: 'is-open-for-requests',
      store: createKeyvStore(),
    }),
    isUserBlocked: user => env.BLOCKED_USERS.includes(user),
    legacyPrereviewApi: {
      app: env.LEGACY_PREREVIEW_API_APP,
      key: env.LEGACY_PREREVIEW_API_KEY,
      url: env.LEGACY_PREREVIEW_URL,
      update: env.LEGACY_PREREVIEW_UPDATE,
    },
    languagesStore: new Keyv({ emitErrors: false, namespace: 'languages', store: createKeyvStore() }),
    locationStore: new Keyv({ emitErrors: false, namespace: 'location', store: createKeyvStore() }),
    mustDeclareUseOfAi: env.MUST_DECLARE_USE_OF_AI,
    orcidApiUrl: env.ORCID_API_URL,
    orcidApiToken: env.ORCID_API_READ_PUBLIC_TOKEN,
    orcidOauth: {
      authorizeUrl: new URL(`${env.ORCID_URL.origin}/oauth/authorize`),
      clientId: env.ORCID_CLIENT_ID,
      clientSecret: env.ORCID_CLIENT_SECRET,
      revokeUrl: new URL(`${env.ORCID_URL.origin}/oauth/revoke`),
      tokenUrl: new URL(`${env.ORCID_URL.origin}/oauth/token`),
    },
    orcidTokenStore: new Keyv({ emitErrors: false, namespace: 'orcid-token', store: createKeyvStore() }),
    redis,
    researchInterestsStore: new Keyv({ emitErrors: false, namespace: 'research-interests', store: createKeyvStore() }),
    reviewRequestStore: new Keyv({ emitErrors: false, namespace: 'review-request', store: createKeyvStore() }),
    scietyListToken: env.SCIETY_LIST_TOKEN,
    sessionCookie: 'session',
    sessionStore: new Keyv({
      emitErrors: false,
      namespace: 'sessions',
      store: createKeyvStore(),
      ttl: Duration.toMillis('30 days'),
    }),
    slackOauth: {
      authorizeUrl: new URL('https://slack.com/oauth/v2/authorize'),
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      tokenUrl: new URL('https://slack.com/api/oauth.v2.access'),
    },
    slackApiToken: env.SLACK_API_TOKEN,
    slackApiUpdate: env.SLACK_UPDATE,
    slackUserIdStore: new Keyv({ emitErrors: false, namespace: 'slack-user-id', store: createKeyvStore() }),
    userOnboardingStore: new Keyv({ emitErrors: false, namespace: 'user-onboarding', store: createKeyvStore() }),
    wasPrereviewRemoved: id => env.REMOVED_PREREVIEWS.includes(id),
    zenodoApiKey: env.ZENODO_API_KEY,
    zenodoUrl: env.ZENODO_URL,
  } satisfies typeof ExpressConfig.Service
})
