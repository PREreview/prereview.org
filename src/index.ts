import { HttpBody, HttpRouter, HttpServer, HttpServerResponse } from '@effect/platform'
import { NodeHttpServer, NodeHttpServerRequest, NodeRuntime } from '@effect/platform-node'
import { createTerminus } from '@godaddy/terminus'
import KeyvRedis from '@keyv/redis'
import { SystemClock } from 'clock-ts'
import * as dns from 'dns'
import { Config, Effect, Layer } from 'effect'
import express from 'express'
import * as List from 'fp-ts-contrib/lib/List.js'
import * as C from 'fp-ts/lib/Console.js'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import { pipe } from 'fp-ts/lib/function.js'
import { execMiddleware } from 'hyper-ts'
import { ExpressConnection } from 'hyper-ts/lib/express.js'
import { Redis } from 'ioredis'
import Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import fetch from 'make-fetch-happen'
import { createRequest } from 'node-mocks-http'
import { createServer } from 'node:http'
import nodemailer from 'nodemailer'
import { P, match } from 'ts-pattern'
import { app, hyperTsApp } from './app.js'
import { decodeEnv } from './env.js'

const env = decodeEnv(process)()

const loggerEnv: L.LoggerEnv = {
  clock: SystemClock,
  logger: pipe(C.log, L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry))),
}

const redis =
  env.REDIS_URI instanceof URL
    ? new Redis(env.REDIS_URI.href, { commandTimeout: 2 * 1000, enableAutoPipelining: true })
    : undefined
const createKeyvStore = () => (redis ? new KeyvRedis(redis) : undefined)

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

const config: import('/home/hff/work/prereview/prereview.org/src/app').ConfigEnv = {
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
  contactEmailAddressStore: new Keyv({ namespace: 'contact-email-address', store: createKeyvStore() }),
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
  phase:
    typeof env.PHASE_TAG === 'string' && typeof env.PHASE_TEXT !== 'undefined'
      ? {
          tag: env.PHASE_TAG,
          text: env.PHASE_TEXT,
        }
      : undefined,
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

const Router = HttpRouter.empty.pipe(HttpRouter.get('/', HttpServerResponse.html('hello')))

const testExpress = express().get('/foo', (req, res) =>
  res.status(201).setHeader('a-header', 24).send('hello from foo'),
)

const Server = Router.pipe(
  Effect.catchTags({
    RouteNotFound: routeNotFound =>
      Effect.gen(function* () {
        const request = NodeHttpServerRequest.toIncomingMessage(routeNotFound.request)
        const response = NodeHttpServerRequest.toServerResponse(routeNotFound.request)
        const hyperResult = hyperTsApp(null, config)
        const result = yield* Effect.tryPromise(() =>
          execMiddleware(hyperResult, new ExpressConnection(createRequest({ ...request }), response))().catch(e =>
            console.log('>>> catch', e),
          ),
        )
        if (E.isRight(result)) {
          const connection = result.right as ExpressConnection<unknown>
          const actions = List.toReversedArray(connection.actions)
          let httpServerResponse = HttpServerResponse.empty()
          console.log(actions)
          actions.forEach(action => {
            switch (action.type) {
              case 'setBody':
                httpServerResponse = HttpServerResponse.setBody(httpServerResponse, HttpBody.raw(action.body))
                break
              case 'setStatus':
                httpServerResponse = HttpServerResponse.setStatus(httpServerResponse, action.status)
                break
              default:
                break
            }
          })
          if (httpServerResponse.status !== 404) {
            return httpServerResponse
          }
        }
        server(request, response)
        yield* Effect.promise(() => new Promise(resolve => response.on('close', resolve, { once: true })))
        return HttpServerResponse.empty()
      }),
  }),
  HttpServer.serve(),
  Layer.provide(NodeHttpServer.layerConfig(() => createServer(), { port: Config.succeed(3001) })),
)

Layer.launch(Server).pipe(NodeRuntime.runMain)

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
      .catch((error: unknown) =>
        L.warnP('Redis unable to disconnect')({ error: E.toError(error).message })(loggerEnv)(),
      )
  },
  signals: ['SIGINT', 'SIGTERM'],
})

server.listen(3000)
