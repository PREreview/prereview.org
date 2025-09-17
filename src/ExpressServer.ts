import { FetchHttpClient } from '@effect/platform'
import KeyvRedis from '@keyv/redis'
import { Duration, Effect, Redacted } from 'effect'
import Keyv from 'keyv'
import { app } from './app.js'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, ExpressConfig, SessionSecret } from './Context.js'
import * as FeatureFlags from './FeatureFlags.js'
import { LegacyPrereviewApi } from './legacy-prereview.js'
import { Nodemailer } from './nodemailer.js'
import { OrcidOauth } from './OrcidOauth.js'
import { PublicUrl } from './public-url.js'
import { DataStoreRedis } from './Redis.js'
import { TemplatePage } from './TemplatePage.js'

export const expressServer = Effect.gen(function* () {
  const config = yield* ExpressConfig
  const fetch = yield* FetchHttpClient.Fetch
  const { clock } = yield* DeprecatedLoggerEnv
  const nodemailer = yield* Nodemailer
  const publicUrl = yield* PublicUrl
  const templatePage = yield* TemplatePage
  const useCrowdinInContext = yield* FeatureFlags.useCrowdinInContext
  const secret = yield* SessionSecret
  const legacyPrereviewApi = yield* LegacyPrereviewApi

  return app({
    clock,
    fetch,
    legacyPrereviewApi: {
      app: legacyPrereviewApi.app,
      key: Redacted.value(legacyPrereviewApi.key),
      url: legacyPrereviewApi.origin,
      update: legacyPrereviewApi.update,
    },
    nodemailer,
    publicUrl,
    secret: Redacted.value(secret),
    templatePage,
    useCrowdinInContext,
    ...config,
  })
})

export const ExpressConfigLive = Effect.gen(function* () {
  const redis = yield* DataStoreRedis
  const env = yield* DeprecatedEnvVars
  const loggerEnv = yield* DeprecatedLoggerEnv
  const orcidOauth = yield* OrcidOauth

  const createKeyvStore = () => new KeyvRedis(redis).on('error', () => undefined)

  return {
    ...loggerEnv,
    allowSiteCrawlers: env.ALLOW_SITE_CRAWLERS,
    authorInviteStore: new Keyv({ emitErrors: false, namespace: 'author-invite', store: createKeyvStore() }),
    avatarStore: new Keyv({ emitErrors: false, namespace: 'avatar-store', store: createKeyvStore() }),
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
    languagesStore: new Keyv({ emitErrors: false, namespace: 'languages', store: createKeyvStore() }),
    locationStore: new Keyv({ emitErrors: false, namespace: 'location', store: createKeyvStore() }),
    orcidOauth: {
      ...orcidOauth,
      clientSecret: Redacted.value(orcidOauth.clientSecret),
    },
    orcidTokenStore: new Keyv({ emitErrors: false, namespace: 'orcid-token', store: createKeyvStore() }),
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
    slackUserIdStore: new Keyv({ emitErrors: false, namespace: 'slack-user-id', store: createKeyvStore() }),
    userOnboardingStore: new Keyv({ emitErrors: false, namespace: 'user-onboarding', store: createKeyvStore() }),
    wasPrereviewRemoved: id => env.REMOVED_PREREVIEWS.includes(id),
  } satisfies typeof ExpressConfig.Service
})
