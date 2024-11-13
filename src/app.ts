import slashes from 'connect-slashes'
import express from 'express'
import asyncHandler from 'express-async-handler'
import type { Json } from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { apply, pipe } from 'fp-ts/lib/function.js'
import helmet from 'helmet'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { toRequestHandler } from 'hyper-ts/lib/express.js'
import type { Redis } from 'ioredis'
import * as L from 'logger-fp-ts'
import * as l from 'logging-ts/lib/IO.js'
import { match, P as p } from 'ts-pattern'
import * as uuid from 'uuid-ts'
import { type RouterEnv, routes } from './app-router.js'
import type { Email } from './email.js'
import { doesPreprintExist, getPreprint, getPreprintId, getPreprintTitle, resolvePreprintId } from './get-preprint.js'
import { pageNotFound } from './http-error.js'
import { getUserOnboarding } from './keyv.js'
import { getPreprintIdFromLegacyPreviewUuid, getProfileIdFromLegacyPreviewUuid } from './legacy-prereview.js'
import { type LegacyEnv, legacyRoutes } from './legacy-routes/index.js'
import type { SupportedLocale } from './locales/index.js'
import { type MailjetApiEnv, sendEmailWithMailjet } from './mailjet.js'
import { type NodemailerEnv, sendEmailWithNodemailer } from './nodemailer.js'
import { page } from './page.js'
import { handleResponse } from './response.js'
import { maybeGetUser, type User } from './user.js'

export type ConfigEnv = Omit<
  RouterEnv & LegacyEnv,
  | 'doesPreprintExist'
  | 'resolvePreprintId'
  | 'getPreprintId'
  | 'generateUuid'
  | 'getUser'
  | 'getUserOnboarding'
  | 'getPreprint'
  | 'getPreprintTitle'
  | 'locale'
  | 'templatePage'
  | 'getPreprintIdFromUuid'
  | 'getProfileIdFromUuid'
  | 'sendEmail'
> &
  (MailjetApiEnv | NodemailerEnv) & {
    allowSiteCrawlers: boolean
  } & {
    redis?: Redis
  }

const sendEmail = (email: Email) =>
  RTE.asksReaderTaskEitherW(
    (env: ConfigEnv) => () =>
      match(env)
        .with({ mailjetApi: p._ }, sendEmailWithMailjet(email))
        .with({ nodemailer: p._ }, sendEmailWithNodemailer(email))
        .exhaustive(),
  )

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

export const app =
  (config: ConfigEnv) =>
  ({ locale, user }: { locale: SupportedLocale; user?: User }) =>
    express()
      .disable('x-powered-by')
      .use((req, res, next) => {
        const url = new URL(req.url, config.publicUrl)

        const details = {
          method: req.method,
          url: req.url,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
          requestId: req.header('Fly-Request-Id') ?? null,
        }

        const startTime = Date.now()

        pipe(
          {
            ...details,
            referrer: req.header('Referer') as Json,
            userAgent: req.header('User-Agent') as Json,
          },
          L.infoP('Received HTTP request'),
        )(config)()

        res.once('finish', () => {
          pipe(
            {
              ...details,
              status: res.statusCode,
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
              ...details,
              status: res.statusCode,
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
      .use(
        express.static('dist/assets', {
          setHeaders: (res, path) => {
            if (/\.[a-z0-9]{8,}\.[A-z0-9]+(?:\.map)?$/.exec(path)) {
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
      .use(
        asyncHandler((req, res, next) => {
          return pipe(
            appMiddleware,
            R.local((env: ConfigEnv): RouterEnv & LegacyEnv => ({
              ...env,
              doesPreprintExist: withEnv(doesPreprintExist, env),
              generateUuid: uuid.v4(),
              getUser: () => (user ? M.of(user) : M.left('no-session')),
              getUserOnboarding: withEnv(getUserOnboarding, env),
              getPreprint: withEnv(getPreprint, env),
              getPreprintTitle: withEnv(getPreprintTitle, env),
              locale,
              templatePage: withEnv(page, env),
              getPreprintIdFromUuid: withEnv(getPreprintIdFromLegacyPreviewUuid, env),
              getProfileIdFromUuid: withEnv(getProfileIdFromLegacyPreviewUuid, env),
              getPreprintId: withEnv(getPreprintId, env),
              resolvePreprintId: withEnv(resolvePreprintId, env),
              sendEmail: withEnv(sendEmail, env),
            })),
            R.local(
              (appEnv: ConfigEnv): ConfigEnv => ({
                ...appEnv,
                logger: pipe(
                  appEnv.logger,
                  l.contramap(entry => ({
                    ...entry,
                    payload: { requestId: req.header('Fly-Request-Id') ?? null, ...entry.payload },
                  })),
                ),
              }),
            ),
            apply(config),
            toRequestHandler,
          )(req, res, next)
        }),
      )
