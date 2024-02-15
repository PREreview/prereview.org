import { createTerminus } from '@godaddy/terminus'
import KeyvRedis from '@keyv/redis'
import { SystemClock } from 'clock-ts'
import * as dns from 'dns'
import * as C from 'fp-ts/Console'
import * as RT from 'fp-ts/ReaderTask'
import { pipe } from 'fp-ts/function'
import Redis from 'ioredis'
import Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import fetch from 'make-fetch-happen'
import nodemailer from 'nodemailer'
import { P, match } from 'ts-pattern'
import { app } from './app'
import { decodeEnv } from './env'

const env = decodeEnv(process)()

const loggerEnv: L.LoggerEnv = {
  clock: SystemClock,
  logger: pipe(C.log, L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
}

const redis =
  env.REDIS_URI instanceof URL
    ? new Redis(env.REDIS_URI.href, { commandTimeout: 2 * 1000, enableAutoPipelining: true })
    : undefined
const keyvStore = redis ? new KeyvRedis(redis) : undefined

redis?.on('connect', () => L.debug('Redis connected')(loggerEnv)())
redis?.on('close', () => L.debug('Redis connection closed')(loggerEnv)())
redis?.on('reconnecting', () => L.info('Redis reconnecting')(loggerEnv)())
redis?.removeAllListeners('error')
redis?.on('error', (error: Error) => L.errorP('Redis connection error')({ error: error.message })(loggerEnv)())

if (env.ZENODO_URL.href.includes('sandbox')) {
  dns.setDefaultResultOrder('ipv4first')
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

const avatarStore = new Keyv()
void avatarStore.set('0000-0002-1472-1824', 'mnl0zzuncxmdbg96iqx1')
void avatarStore.set('0000-0002-6109-0367', 'c4a5fhc4arzb2chn6txg')
void avatarStore.set('0000-0003-4921-6155', 'dvyalmcsaz6bwri1iux4')

const server = app({
  ...loggerEnv,
  allowSiteCrawlers: env.ALLOW_SITE_CRAWLERS,
  authorInviteStore: new Keyv({ namespace: 'author-invite', store: keyvStore }),
  avatarStore,
  canConnectOrcidProfile: () => true,
  cloudinaryApi: { cloudName: 'prereview', key: env.CLOUDINARY_API_KEY, secret: env.CLOUDINARY_API_SECRET },
  contactEmailAddressStore: new Keyv({ namespace: 'contact-email-address', store: keyvStore }),
  fathomId: env.FATHOM_SITE_ID,
  fetch: fetch.defaults({
    cachePath: 'data/cache',
    headers: {
      'User-Agent': `PREreview (${env.PUBLIC_URL.href}; mailto:engineering@prereview.org)`,
    },
  }),
  formStore: new Keyv({ namespace: 'forms', store: keyvStore }),
  careerStageStore: new Keyv({ namespace: 'career-stage', store: keyvStore }),
  ghostApi: {
    key: env.GHOST_API_KEY,
  },
  isOpenForRequestsStore: new Keyv({ namespace: 'is-open-for-requests', store: keyvStore }),
  isUserBlocked: user => env.BLOCKED_USERS.includes(user),
  legacyPrereviewApi: {
    app: env.LEGACY_PREREVIEW_API_APP,
    key: env.LEGACY_PREREVIEW_API_KEY,
    url: env.LEGACY_PREREVIEW_URL,
    update: env.LEGACY_PREREVIEW_UPDATE,
  },
  languagesStore: new Keyv({ namespace: 'languages', store: keyvStore }),
  locationStore: new Keyv({ namespace: 'location', store: keyvStore }),
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
  orcidTokenStore: new Keyv({ namespace: 'orcid-token', store: keyvStore }),
  phase:
    typeof env.PHASE_TAG === 'string' && typeof env.PHASE_TEXT !== 'undefined'
      ? {
          tag: env.PHASE_TAG,
          text: env.PHASE_TEXT,
        }
      : undefined,
  publicUrl: env.PUBLIC_URL,
  researchInterestsStore: new Keyv({ namespace: 'research-interests', store: keyvStore }),
  scietyListToken: env.SCIETY_LIST_TOKEN,
  secret: env.SECRET,
  sessionCookie: 'session',
  sessionStore: new Keyv({ namespace: 'sessions', store: keyvStore, ttl: 1000 * 60 * 60 * 24 * 30 }),
  slackOauth: {
    authorizeUrl: new URL('https://slack.com/oauth/v2/authorize'),
    clientId: env.SLACK_CLIENT_ID,
    clientSecret: env.SLACK_CLIENT_SECRET,
    tokenUrl: new URL('https://slack.com/api/oauth.v2.access'),
  },
  slackApiToken: env.SLACK_API_TOKEN,
  slackApiUpdate: env.SLACK_UPDATE,
  slackUserIdStore: new Keyv({ namespace: 'slack-user-id', store: keyvStore }),
  userOnboardingStore: new Keyv({ namespace: 'user-onboarding', store: keyvStore }),
  wasPrereviewRemoved: id => env.REMOVED_PREREVIEWS.includes(id),
  zenodoApiKey: env.ZENODO_API_KEY,
  zenodoUrl: env.ZENODO_URL,
})

server.on('listening', () => {
  L.debug('Server listening')(loggerEnv)()
})

createTerminus(server, {
  healthChecks: {
    '/health': async () => {
      if (!(redis instanceof Redis)) {
        return
      }

      if (redis.status !== 'ready') {
        throw new Error(`Redis not ready (${redis.status})`)
      }

      await redis.ping()
    },
  },
  logger: (message, error) => L.errorP(message)({ name: error.name, message: error.message })(loggerEnv)(),
  onShutdown: RT.fromReaderIO(L.debug('Shutting server down'))(loggerEnv),
  onSignal: async () => {
    L.debug('Signal received')(loggerEnv)()

    if (!(redis instanceof Redis)) {
      return
    }

    await redis
      .quit()
      .then(() => L.debug('Redis disconnected')(loggerEnv)())
      .catch((error: Error) => L.warnP('Redis unable to disconnect')({ error: error.message })(loggerEnv)())
  },
  signals: ['SIGINT', 'SIGTERM'],
})

server.listen(3000)
