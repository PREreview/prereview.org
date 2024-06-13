import slashes from 'connect-slashes'
import express from 'express'
import asyncHandler from 'express-async-handler'
import type { Json } from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { apply, flow, identity, pipe } from 'fp-ts/lib/function.js'
import helmet from 'helmet'
import http from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import { getSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { toRequestHandler } from 'hyper-ts/lib/express.js'
import * as L from 'logger-fp-ts'
import * as l from 'logging-ts/lib/IO.js'
import { match, P as p } from 'ts-pattern'
import * as uuid from 'uuid-ts'
import { getPreprintFromCrossref, isCrossrefPreprintDoi } from './crossref.js'
import { getPreprintFromDatacite, isDatacitePreprintDoi } from './datacite.js'
import type { Email } from './email.js'
import { type SleepEnv, collapseRequests, logFetch, useStaleCache } from './fetch.js'
import { pageNotFound } from './http-error.js'
import { getUserOnboarding } from './keyv.js'
import { getPreprintIdFromLegacyPreviewUuid, getProfileIdFromLegacyPreviewUuid } from './legacy-prereview.js'
import { type LegacyEnv, legacyRoutes } from './legacy-routes/index.js'
import { type MailjetApiEnv, sendEmailWithMailjet } from './mailjet.js'
import { type NodemailerEnv, sendEmailWithNodemailer } from './nodemailer.js'
import { page } from './page.js'
import { getPreprintFromPhilsci } from './philsci.js'
import { handleResponse } from './response.js'
import { type RouterEnv, routes } from './router.js'
import type { IndeterminatePreprintId } from './types/preprint-id.js'
import { getUserFromSession, maybeGetUser } from './user.js'

export type ConfigEnv = Omit<
  RouterEnv & LegacyEnv,
  | 'doesPreprintExist'
  | 'resolvePreprintId'
  | 'generateUuid'
  | 'getUser'
  | 'getUserOnboarding'
  | 'getPreprint'
  | 'getPreprintTitle'
  | 'templatePage'
  | 'getPreprintIdFromUuid'
  | 'getProfileIdFromUuid'
  | 'sendEmail'
  | 'sleep'
> &
  (MailjetApiEnv | NodemailerEnv) & {
    allowSiteCrawlers: boolean
  }

const getPreprintFromSource = (id: IndeterminatePreprintId) =>
  match(id)
    .with({ type: 'philsci' }, getPreprintFromPhilsci)
    .with({ value: p.when(isCrossrefPreprintDoi) }, getPreprintFromCrossref)
    .with({ value: p.when(isDatacitePreprintDoi) }, getPreprintFromDatacite)
    .exhaustive()

const getPreprint = flow(
  getPreprintFromSource,
  RTE.mapLeft(error =>
    match(error)
      .with('not-a-preprint', () => 'not-found' as const)
      .otherwise(identity),
  ),
)

const getPreprintTitle = flow(
  getPreprint,
  RTE.local(useStaleCache()),
  RTE.map(preprint => ({
    id: preprint.id,
    language: preprint.title.language,
    title: preprint.title.text,
  })),
)

const resolvePreprintId = flow(
  getPreprintFromSource,
  RTE.local(useStaleCache()),
  RTE.map(preprint => preprint.id),
)

const doesPreprintExist = flow(
  resolvePreprintId,
  RTE.map(() => true),
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(false))
      .with('not-a-preprint', RTE.left)
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

const sendEmail = (email: Email) =>
  RTE.asksReaderTaskEitherW(
    (env: ConfigEnv) => () =>
      match(env)
        .with({ mailjetApi: p._ }, sendEmailWithMailjet(email))
        .with({ nodemailer: p._ }, sendEmailWithNodemailer(email))
        .exhaustive(),
  )

const getUser = pipe(getSession(), RM.chainOptionKW(() => 'no-session' as const)(getUserFromSession))

const appMiddleware: RM.ReaderMiddleware<RouterEnv & LegacyEnv, StatusOpen, ResponseEnded, never, void> = pipe(
  routes,
  RM.orElseW(() => legacyRoutes),
  RM.orElseW(error =>
    match(error)
      .with({ status: 404 }, () =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.of(pageNotFound)),
          RM.ichainW(handleResponse),
        ),
      )
      .exhaustive(),
  ),
)

const withEnv =
  <R, A extends ReadonlyArray<unknown>, B>(f: (...a: A) => R.Reader<R, B>, env: R) =>
  (...a: A) =>
    f(...a)(env)

export const app = (config: ConfigEnv) => {
  const app = express()
    .disable('x-powered-by')
    .use((req, res, next) => {
      const requestId = req.header('Fly-Request-Id') ?? null

      const startTime = Date.now()

      pipe(
        {
          method: req.method,
          url: req.url,
          referrer: req.header('Referer') as Json,
          userAgent: req.header('User-Agent') as Json,
          requestId,
        },
        L.infoP('Received HTTP request'),
      )(config)()

      res.once('finish', () => {
        pipe(
          {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            requestId,
            time: Date.now() - startTime,
          },
          L.infoP('Sent HTTP response'),
        )(config)()
      })

      res.once('close', () => {
        if (res.writableFinished) {
          return
        }

        pipe(
          {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            requestId,
            time: Date.now() - startTime,
          },
          L.warnP('HTTP response may not have been completely sent'),
        )(config)()
      })

      if (!config.allowSiteCrawlers) {
        res.header('X-Robots-Tag', 'none, noarchive')
      }

      next()
    })
    .use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            'script-src': ["'self'", 'cdn.usefathom.com'],
            'img-src': [
              "'self'",
              'data:',
              'avatars.slack-edge.com',
              'cdn.usefathom.com',
              'content.prereview.org',
              'res.cloudinary.com',
              'secure.gravatar.com',
              '*.wp.com',
            ],
            upgradeInsecureRequests: config.publicUrl.protocol === 'https:' ? [] : null,
          },
        },
        crossOriginEmbedderPolicy: {
          policy: 'credentialless',
        },
        strictTransportSecurity: config.publicUrl.protocol === 'https:',
      }),
    )
    .get('/robots.txt', (req, res) => {
      res.type('text/plain')
      res.send('User-agent: *\nAllow: /')
    })
    .use(
      express.static('dist/assets', {
        setHeaders: (res, path) => {
          if (path.match(/\.[a-z0-9]{8,}\.[A-z0-9]+(?:\.map)?$/)) {
            res.setHeader('Cache-Control', `public, max-age=${60 * 60 * 24 * 365}, immutable`)
          } else {
            res.setHeader('Cache-Control', `public, max-age=${60 * 60}, stale-while-revalidate=${60 * 60 * 24}`)
          }
        },
      }),
    )
    .use(
      asyncHandler(
        createProxyMiddleware({
          target: config.legacyPrereviewApi.url,
          changeOrigin: true,
          pathFilter: '/api/v2/',
          on: {
            proxyReq: (proxyReq, req) => {
              const payload = {
                url: `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`,
                method: proxyReq.method,
                requestId: req.headers['fly-request-id'] ?? null,
              }

              L.debugP('Sending proxy HTTP request')(payload)(config)()

              proxyReq.once('response', response => {
                L.debugP('Received proxy HTTP response')({
                  ...payload,
                  status: response.statusCode as Json,
                  headers: response.headers as Json,
                })(config)()
              })

              proxyReq.once('error', error => {
                L.warnP('Did not receive a proxy HTTP response')({
                  ...payload,
                  error: error.message,
                })(config)()
              })
            },
          },
        }),
      ),
    )
    .use(slashes(false))
    .use(express.urlencoded({ extended: true }))
    .use((req, res, next) => {
      res.set('Cache-Control', 'no-cache, private')
      res.vary('Cookie')

      next()
    })
    .use((req, res, next) => {
      return pipe(
        appMiddleware,
        R.local((env: ConfigEnv & SleepEnv): RouterEnv & LegacyEnv => ({
          ...env,
          doesPreprintExist: withEnv(doesPreprintExist, env),
          generateUuid: uuid.v4(),
          getUser: withEnv(() => getUser, env),
          getUserOnboarding: withEnv(getUserOnboarding, env),
          getPreprint: withEnv(getPreprint, env),
          getPreprintTitle: withEnv(getPreprintTitle, env),
          templatePage: withEnv(page, env),
          getPreprintIdFromUuid: withEnv(getPreprintIdFromLegacyPreviewUuid, env),
          getProfileIdFromUuid: withEnv(getProfileIdFromLegacyPreviewUuid, env),
          resolvePreprintId: withEnv(resolvePreprintId, env),
          sendEmail: withEnv(sendEmail, env),
        })),
        R.local(collapseRequests()),
        R.local(logFetch()),
        R.local((appEnv: ConfigEnv): ConfigEnv & SleepEnv => ({
          ...appEnv,
          logger: pipe(
            appEnv.logger,
            l.contramap(entry => ({
              ...entry,
              payload: { requestId: req.header('Fly-Request-Id') ?? null, ...entry.payload },
            })),
          ),
          sleep: duration => new Promise(resolve => setTimeout(resolve, duration)),
        })),
        apply(config),
        toRequestHandler,
      )(req, res, next)
    })

  return http.createServer(app)
}
