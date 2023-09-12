import { createTerminus } from '@godaddy/terminus'
import KeyvRedis from '@keyv/redis'
import cacache from 'cacache'
import { SystemClock } from 'clock-ts'
import * as dns from 'dns'
import * as C from 'fp-ts/Console'
import type { JsonRecord } from 'fp-ts/Json'
import * as RT from 'fp-ts/ReaderTask'
import { pipe } from 'fp-ts/function'
import Redis from 'ioredis'
import Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import fetch from 'make-fetch-happen'
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

const server = app({
  ...loggerEnv,
  allowSiteCrawlers: env.ALLOW_SITE_CRAWLERS,
  canRapidReview: () => true,
  cloudinaryApi: { cloudName: 'prereview', key: env.CLOUDINARY_API_KEY, secret: env.CLOUDINARY_API_SECRET },
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
  legacyPrereviewApi: {
    app: env.LEGACY_PREREVIEW_API_APP,
    key: env.LEGACY_PREREVIEW_API_KEY,
    url: env.LEGACY_PREREVIEW_URL,
    update: env.LEGACY_PREREVIEW_UPDATE,
  },
  oauth: {
    authorizeUrl: new URL('https://orcid.org/oauth/authorize'),
    clientId: env.ORCID_CLIENT_ID,
    clientSecret: env.ORCID_CLIENT_SECRET,
    redirectUri: new URL('/orcid', env.PUBLIC_URL),
    tokenUrl: new URL('https://orcid.org/oauth/token'),
  },
  phase:
    typeof env.PHASE_TAG === 'string' && typeof env.PHASE_TEXT === 'string'
      ? {
          tag: env.PHASE_TAG,
          text: env.PHASE_TEXT,
        }
      : undefined,
  publicUrl: env.PUBLIC_URL,
  researchInterestsStore: new Keyv({ namespace: 'research-interests', store: keyvStore }),
  secret: env.SECRET,
  sessionCookie: 'session',
  sessionStore: new Keyv({ namespace: 'sessions', store: keyvStore, ttl: 1000 * 60 * 60 * 24 * 30 }),
  slackApiToken: env.SLACK_API_TOKEN,
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

void Promise.resolve()
  .then(() => L.debug('Verifying cache')(loggerEnv)())
  .then(() => cacache.verify('data/cache'))
  .then((stats: JsonRecord) => L.debugP('Cache verified')(stats)(loggerEnv)())
  .catch((error: Error) => L.errorP('Failed to verify cache')({ error: error.message })(loggerEnv)())

server.listen(3000)
