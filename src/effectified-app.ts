import KeyvRedis from '@keyv/redis'
import { SystemClock } from 'clock-ts'
import { Context, Effect, pipe } from 'effect'
import type { Express } from 'express'
import * as C from 'fp-ts/lib/Console.js'
import type { Redis } from 'ioredis'
import Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import fetch from 'make-fetch-happen'
import nodemailer from 'nodemailer'
import { P, match } from 'ts-pattern'
import { type ConfigEnv, app } from './app.js'
import { decodeEnv } from './env.js'

export class RedisService extends Context.Tag('RedisService')<RedisService, Redis>() {}

export const effectifiedExpressApp: Effect.Effect<Express, never, RedisService> = Effect.gen(function* () {
  const redis = yield* RedisService
  const env = decodeEnv(process)()

  const createKeyvStore = () => new KeyvRedis(redis)

  const loggerEnv: L.LoggerEnv = {
    clock: SystemClock,
    logger: pipe(C.log, L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
  }

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

  const config: ConfigEnv = {
    ...loggerEnv,
    allowSiteCrawlers: env.ALLOW_SITE_CRAWLERS,
    authorInviteStore: new Keyv({ namespace: 'author-invite', store: createKeyvStore() }),
    avatarStore: new Keyv({ namespace: 'avatar-store', store: createKeyvStore() }),
    canConnectOrcidProfile: () => true,
    canRequestReviews: () => true,
    canSeeGatesLogo: true,
    canUploadAvatar: () => true,
    canUseSearchQueries: () => true,
    cloudinaryApi: { cloudName: 'prereview', key: env.CLOUDINARY_API_KEY, secret: env.CLOUDINARY_API_SECRET },
    coarNotifyUrl: env.COAR_NOTIFY_URL,
    coarNotifyToken: env.COAR_NOTIFY_TOKEN,
    contactEmailAddressStore: new Keyv({ namespace: 'contact-email-address', store: createKeyvStore() }),
    environmentLabel: env.ENVIRONMENT_LABEL,
    fathomId: env.FATHOM_SITE_ID,
    fetch: fetch.defaults({
      cachePath: 'data/cache',
      headers: {
        'User-Agent': `PREreview (${env.PUBLIC_URL.href}; mailto:engineering@prereview.org)`,
      },
    }),
    formStore: new Keyv({ namespace: 'forms', store: createKeyvStore() }),
    careerStageStore: new Keyv({ namespace: 'career-stage', store: createKeyvStore() }),
    ghostApi: {
      key: env.GHOST_API_KEY,
    },
    isOpenForRequestsStore: new Keyv({ namespace: 'is-open-for-requests', store: createKeyvStore() }),
    isUserBlocked: user => env.BLOCKED_USERS.includes(user),
    legacyPrereviewApi: {
      app: env.LEGACY_PREREVIEW_API_APP,
      key: env.LEGACY_PREREVIEW_API_KEY,
      url: env.LEGACY_PREREVIEW_URL,
      update: env.LEGACY_PREREVIEW_UPDATE,
    },
    languagesStore: new Keyv({ namespace: 'languages', store: createKeyvStore() }),
    locationStore: new Keyv({ namespace: 'location', store: createKeyvStore() }),
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
    orcidTokenStore: new Keyv({ namespace: 'orcid-token', store: createKeyvStore() }),
    publicUrl: env.PUBLIC_URL,
    researchInterestsStore: new Keyv({ namespace: 'research-interests', store: createKeyvStore() }),
    reviewRequestStore: new Keyv({ namespace: 'review-request', store: createKeyvStore() }),
    scietyListToken: env.SCIETY_LIST_TOKEN,
    secret: env.SECRET,
    sessionCookie: 'session',
    sessionStore: new Keyv({ namespace: 'sessions', store: createKeyvStore(), ttl: 1000 * 60 * 60 * 24 * 30 }),
    slackOauth: {
      authorizeUrl: new URL('https://slack.com/oauth/v2/authorize'),
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      tokenUrl: new URL('https://slack.com/api/oauth.v2.access'),
    },
    slackApiToken: env.SLACK_API_TOKEN,
    slackApiUpdate: env.SLACK_UPDATE,
    slackUserIdStore: new Keyv({ namespace: 'slack-user-id', store: createKeyvStore() }),
    userOnboardingStore: new Keyv({ namespace: 'user-onboarding', store: createKeyvStore() }),
    wasPrereviewRemoved: id => env.REMOVED_PREREVIEWS.includes(id),
    zenodoApiKey: env.ZENODO_API_KEY,
    zenodoUrl: env.ZENODO_URL,
  }

  const server = app(config)

  return server
})
