import { FetchHttpClient } from '@effect/platform'
import KeyvRedis from '@keyv/redis'
import { Effect, Redacted } from 'effect'
import Keyv from 'keyv'
import { app } from './app.ts'
import {
  AllowSiteCrawlers,
  DeprecatedEnvVars,
  DeprecatedLoggerEnv,
  ExpressConfig,
  SessionSecret,
  SessionStore,
} from './Context.ts'
import * as EffectToFpts from './EffectToFpts.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import { GetPseudonym, IsUserBlocked, type GetPseudonymEnv } from './log-in/index.ts'
import { OrcidOauth } from './OrcidOauth.ts'
import { PublicUrl } from './public-url.ts'
import { DataStoreRedis } from './Redis.ts'
import { TemplatePage } from './TemplatePage.ts'

export const expressServer = Effect.gen(function* () {
  const config = yield* ExpressConfig
  const fetch = yield* FetchHttpClient.Fetch
  const { clock } = yield* DeprecatedLoggerEnv
  const publicUrl = yield* PublicUrl
  const templatePage = yield* TemplatePage
  const useCrowdinInContext = yield* FeatureFlags.useCrowdinInContext
  const secret = yield* SessionSecret
  const sessionStore = yield* SessionStore
  const getPseudonym: GetPseudonymEnv['getPseudonym'] = yield* EffectToFpts.makeTaskEitherK(
    Effect.fn(function* (user: Parameters<typeof GetPseudonym.Service>[0]) {
      const getPseudonym = yield* GetPseudonym

      return yield* getPseudonym(user)
    }),
  )
  const allowSiteCrawlers = yield* AllowSiteCrawlers
  const isUserBlocked = yield* IsUserBlocked

  return app({
    allowSiteCrawlers,
    clock,
    fetch,
    isUserBlocked,
    getPseudonym,
    publicUrl,
    secret: Redacted.value(secret),
    sessionCookie: sessionStore.cookie,
    sessionStore: sessionStore.store,
    templatePage,
    useCrowdinInContext,
    ...config,
  })
})

export const ExpressConfigLive = Effect.gen(function* () {
  const redis = yield* DataStoreRedis
  const env = yield* DeprecatedEnvVars
  const orcidOauth = yield* OrcidOauth

  const createKeyvStore = () => new KeyvRedis(redis).on('error', () => undefined)

  return {
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
    languagesStore: new Keyv({ emitErrors: false, namespace: 'languages', store: createKeyvStore() }),
    locationStore: new Keyv({ emitErrors: false, namespace: 'location', store: createKeyvStore() }),
    orcidOauth: {
      ...orcidOauth,
      clientSecret: Redacted.value(orcidOauth.clientSecret),
    },
    orcidTokenStore: new Keyv({ emitErrors: false, namespace: 'orcid-token', store: createKeyvStore() }),
    researchInterestsStore: new Keyv({ emitErrors: false, namespace: 'research-interests', store: createKeyvStore() }),
    reviewRequestStore: new Keyv({ emitErrors: false, namespace: 'review-request', store: createKeyvStore() }),
    slackOauth: {
      authorizeUrl: new URL('https://slack.com/oauth/v2/authorize'),
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      tokenUrl: new URL('https://slack.com/api/oauth.v2.access'),
    },
    slackUserIdStore: new Keyv({ emitErrors: false, namespace: 'slack-user-id', store: createKeyvStore() }),
    userOnboardingStore: new Keyv({ emitErrors: false, namespace: 'user-onboarding', store: createKeyvStore() }),
  } satisfies typeof ExpressConfig.Service
})
