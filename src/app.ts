import type { Runtime } from 'effect'
import express from 'express'
import asyncHandler from 'express-async-handler'
import type { Json } from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import { apply, pipe } from 'fp-ts/lib/function.js'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { toRequestHandler } from 'hyper-ts/lib/express.js'
import type { Redis } from 'ioredis'
import * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import * as EffectToFpts from './EffectToFpts.js'
import { withEnv } from './Fpts.js'
import { PageNotFound } from './PageNotFound/index.js'
import { type RouterEnv, routes } from './app-router.js'
import { doesPreprintExist, getPreprint, getPreprintId, getPreprintTitle, resolvePreprintId } from './get-preprint.js'
import { getPage, type GhostApiEnv } from './ghost.js'
import { getUserOnboarding } from './keyv.js'
import { getPreprintIdFromLegacyPreviewUuid, getProfileIdFromLegacyPreviewUuid } from './legacy-prereview.js'
import { type LegacyEnv, legacyRoutes } from './legacy-routes/index.js'
import type { SupportedLocale } from './locales/index.js'
import { type NodemailerEnv, sendEmailWithNodemailer } from './nodemailer.js'
import { handleResponse } from './response.js'
import { securityHeaders } from './securityHeaders.js'
import { maybeGetUser, type User } from './user.js'

export type ConfigEnv = Omit<
  RouterEnv & LegacyEnv,
  | 'doesPreprintExist'
  | 'resolvePreprintId'
  | 'getPreprintId'
  | 'getUser'
  | 'getUserOnboarding'
  | 'getPageFromGhost'
  | 'getPreprint'
  | 'getPreprintTitle'
  | 'locale'
  | 'logger'
  | 'getPreprintIdFromUuid'
  | 'getProfileIdFromUuid'
  | 'runtime'
  | 'sendEmail'
> &
  GhostApiEnv &
  NodemailerEnv & {
    allowSiteCrawlers: boolean
    useCrowdinInContext: boolean
    redis?: Redis
  }

const appMiddleware: RM.ReaderMiddleware<RouterEnv & LegacyEnv, StatusOpen, ResponseEnded, never, void> = pipe(
  routes,
  RM.orElseW(() => legacyRoutes),
  RM.orElseW(error =>
    match(error)
      .with({ status: 404 }, () =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apS(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.apSW('response', EffectToFpts.toReaderMiddleware(PageNotFound)),
          RM.ichainW(handleResponse),
        ),
      )
      .exhaustive(),
  ),
)

export type AppContext = Runtime.Runtime.Context<RouterEnv['runtime']>

type AppRuntime = Runtime.Runtime<AppContext>

export const app = (config: ConfigEnv) => {
  const proxy = createProxyMiddleware<Express.Request, Express.Response>({
    target: config.legacyPrereviewApi.url,
    changeOrigin: true,
    pathFilter: '/api/v2/',
    on: {
      proxyReq: (proxyReq, req) => {
        const logger = req.logger

        const payload = {
          url: `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`,
          method: proxyReq.method,
        }

        L.debugP('Sending proxy HTTP request')(payload)({ ...config, logger })()

        proxyReq.once('response', response => {
          L.debugP('Received proxy HTTP response')({
            ...payload,
            status: response.statusCode as Json,
            headers: response.headers as Json,
          })({ ...config, logger })()
        })

        proxyReq.once('error', error => {
          L.warnP('Did not receive a proxy HTTP response')({
            ...payload,
            error: error.message,
          })({ ...config, logger })()
        })
      },
    },
  })

  return ({
    locale,
    logger,
    runtime,
    user,
  }: {
    locale: SupportedLocale
    logger: L.Logger
    runtime: AppRuntime
    user?: User
  }) => {
    return express()
      .use((req, res, next) => {
        req.logger = logger

        if (!config.allowSiteCrawlers) {
          res.header('X-Robots-Tag', 'none, noarchive')
        }

        next()
      })
      .use((req, res, next) => {
        res.setHeaders(new Headers(securityHeaders(config.publicUrl.protocol, config.useCrowdinInContext)))
        res.removeHeader('X-Powered-By')

        next()
      })
      .use(asyncHandler(proxy))
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
            R.local((env: ConfigEnv & L.LoggerEnv & { runtime: AppRuntime }): RouterEnv & LegacyEnv => ({
              ...env,
              doesPreprintExist: withEnv(doesPreprintExist, env),
              getUser: () => (user ? M.of(user) : M.left('no-session')),
              getUserOnboarding: withEnv(getUserOnboarding, env),
              getPageFromGhost: withEnv(getPage, env),
              getPreprint: withEnv(getPreprint, env),
              getPreprintTitle: withEnv(getPreprintTitle, env),
              locale,
              getPreprintIdFromUuid: withEnv(getPreprintIdFromLegacyPreviewUuid, env),
              getProfileIdFromUuid: withEnv(getProfileIdFromLegacyPreviewUuid, env),
              getPreprintId: withEnv(getPreprintId, env),
              resolvePreprintId: withEnv(resolvePreprintId, env),
              sendEmail: withEnv(sendEmailWithNodemailer, env),
            })),
            R.local((appEnv: ConfigEnv): ConfigEnv & L.LoggerEnv & { runtime: AppRuntime } => ({
              ...appEnv,
              logger,
              runtime,
            })),
            apply(config),
            toRequestHandler,
          )(req, res, next)
        }),
      )
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      logger: L.Logger
    }
  }
}
