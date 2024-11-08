import { FetchHttpClient } from '@effect/platform'
import KeyvRedis from '@keyv/redis'
import { Config, Effect } from 'effect'
import Keyv from 'keyv'
import nodemailer from 'nodemailer'
import { P, match } from 'ts-pattern'
import { app, type ConfigEnv } from './app.js'
import { DeprecatedEnvVars, DeprecatedLoggerEnv, DeprecatedSleepEnv, ExpressConfig, Redis } from './Context.js'
import { CanWriteComments } from './feature-flags.js'

export const expressServer = Effect.gen(function* () {
  const config = yield* ExpressConfig
  const fetch = yield* FetchHttpClient.Fetch
  const sleep = yield* DeprecatedSleepEnv
  const canWriteComments = yield* CanWriteComments

  return app({ canWriteComments, fetch, ...sleep, ...config } as unknown as ConfigEnv)
})

export const ExpressConfigLive = Effect.gen(function* () {
  const redis = yield* Redis
  const env = yield* DeprecatedEnvVars
  const loggerEnv = yield* DeprecatedLoggerEnv

  const canChooseLocale = yield* Config.withDefault(Config.boolean('CAN_CHOOSE_LOCALE'), false)

  const sendMailEnv = match(env)
    .with({ MAILJET_API_KEY: P.string }, env => ({
      mailjetApi: {
        key: env.MAILJET_API_KEY,
        secret: env.MAILJET_API_SECRET,
        sandbox: env.MAILJET_API_SANDBOX,
      },
    }))
    .with({ SMTP_URI: P.instanceOf(URL) }, env => ({
      nodemailer: nodemailer.createTransport(env.SMTP_URI.href),
    }))
    .exhaustive()
  const createKeyvStore = () => new KeyvRedis(redis).on('error', () => undefined)

  return {
    ...loggerEnv,
    allowSiteCrawlers: env.ALLOW_SITE_CRAWLERS,
    authorInviteStore: new Keyv({ emitErrors: false, namespace: 'author-invite', store: createKeyvStore() }),
    avatarStore: new Keyv({ emitErrors: false, namespace: 'avatar-store', store: createKeyvStore() }),
    canChooseLocale,
    canConnectOrcidProfile: () => true,
    canRequestReviews: () => true,
    canSeeGatesLogo: true,
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
    environmentLabel: env.ENVIRONMENT_LABEL,
    fathomId: env.FATHOM_SITE_ID,
    formStore: new Keyv({ emitErrors: false, namespace: 'forms', store: createKeyvStore() }),
    careerStageStore: new Keyv({ emitErrors: false, namespace: 'career-stage', store: createKeyvStore() }),
    ghostApi: {
      key: env.GHOST_API_KEY,
    },
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
    ...sendMailEnv,
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
    publicUrl: env.PUBLIC_URL,
    redis,
    researchInterestsStore: new Keyv({ emitErrors: false, namespace: 'research-interests', store: createKeyvStore() }),
    reviewRequestStore: new Keyv({ emitErrors: false, namespace: 'review-request', store: createKeyvStore() }),
    scietyListToken: env.SCIETY_LIST_TOKEN,
    secret: env.SECRET,
    sessionCookie: 'session',
    sessionStore: new Keyv({
      emitErrors: false,
      namespace: 'sessions',
      store: createKeyvStore(),
      ttl: 1000 * 60 * 60 * 24 * 30,
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
