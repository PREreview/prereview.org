import { FetchHttpClient } from '@effect/platform'
import { Effect, Redacted } from 'effect'
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
import { KeyvStores } from './keyv.ts'
import { GetPseudonym, IsUserBlocked, type GetPseudonymEnv } from './log-in/index.ts'
import { OrcidOauth } from './OrcidOauth.ts'
import { PublicUrl } from './public-url.ts'
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
  const keyvStores = yield* KeyvStores
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
    userOnboardingStore: keyvStores.userOnboardingStore,
    ...config,
  })
})

export const ExpressConfigLive = Effect.gen(function* () {
  const env = yield* DeprecatedEnvVars
  const orcidOauth = yield* OrcidOauth

  return {
    orcidOauth: {
      ...orcidOauth,
      clientSecret: Redacted.value(orcidOauth.clientSecret),
    },
    slackOauth: {
      authorizeUrl: new URL('https://slack.com/oauth/v2/authorize'),
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      tokenUrl: new URL('https://slack.com/api/oauth.v2.access'),
    },
  } satisfies typeof ExpressConfig.Service
})
