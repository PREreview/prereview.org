import { Function, pipe, type Runtime } from 'effect'
import express from 'express'
import asyncHandler from 'express-async-handler'
import type { Json } from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { toRequestHandler } from 'hyper-ts/lib/express.js'
import type { Redis } from 'ioredis'
import * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import * as EffectToFpts from './EffectToFpts.js'
import { withEnv } from './Fpts.js'
import * as Keyv from './keyv.js'
// eslint-disable-next-line import/no-internal-modules
import * as LocaleCookie from './HttpMiddleware/LocaleCookie.js'
import { PageNotFound } from './PageNotFound/index.js'
import * as Preprints from './Preprints/index.js'
import { type RouterEnv, routes } from './app-router.js'
import { getUserOnboarding } from './keyv.js'
import { getPreprintIdFromLegacyPreviewUuid, getProfileIdFromLegacyPreviewUuid } from './legacy-prereview.js'
import { type LegacyEnv, legacyRoutes } from './legacy-routes/index.js'
import { isUserSelectableLocale, type SupportedLocale } from './locales/index.js'
import { type NodemailerEnv, sendEmailWithNodemailer } from './nodemailer.js'
import { handleResponse } from './response.js'
import { securityHeaders } from './securityHeaders.js'
import type { User } from './user.js'

export type ConfigEnv = Omit<
  RouterEnv & LegacyEnv,
  | 'resolvePreprintId'
  | 'getPreprintId'
  | 'getUser'
  | 'getUserOnboarding'
  | 'getPreprint'
  | 'getPreprintTitle'
  | 'locale'
  | 'logger'
  | 'getPreprintIdFromUuid'
  | 'getProfileIdFromUuid'
  | 'runtime'
  | 'sendEmail'
  | 'addToSession'
  | 'popFromSession'
> &
  NodemailerEnv & {
    allowSiteCrawlers: boolean
    useCrowdinInContext: boolean
    redis?: Redis
  }

const appMiddleware: RM.ReaderMiddleware<RouterEnv & LegacyEnv, StatusOpen, ResponseEnded, never, void> = pipe(
  routes,
  RM.orElseW(() =>
    pipe(
      RM.gets(c => c.getOriginalUrl()),
      RM.chainReaderTaskEitherK(legacyRoutes),
      RM.bindTo('response'),
      RM.apSW(
        'user',
        RM.asks((env: RouterEnv) => env.user),
      ),
      RM.apSW(
        'locale',
        RM.asks((env: RouterEnv) => env.locale),
      ),
      RM.ichainW(handleResponse),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with({ status: 404 }, () =>
        pipe(
          RM.of({}),
          RM.apS(
            'user',
            RM.asks((env: RouterEnv) => env.user),
          ),
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

export type AppContext = Runtime.Runtime.Context<RouterEnv['runtime']> | Preprints.Preprints

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
    sessionId,
    user,
  }: {
    locale: SupportedLocale
    logger: L.Logger
    runtime: AppRuntime
    sessionId?: string
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
      .use(
        isUserSelectableLocale(locale)
          ? LocaleCookie.setLocaleCookieInExpress(locale)
          : (req, res, next) => {
              res.cookie('locale', locale)

              next()
            },
      )
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
              addToSession: withEnv(
                (key: string, value: Json) =>
                  typeof sessionId === 'string'
                    ? Keyv.addToSession(sessionId, key, value)
                    : RTE.left('unavailable' as const),
                env,
              ),
              user,
              getUserOnboarding: withEnv(getUserOnboarding, env),
              getPreprint: withEnv(EffectToFpts.toReaderTaskEitherK(Preprints.getPreprint), env),
              getPreprintTitle: withEnv(EffectToFpts.toReaderTaskEitherK(Preprints.getPreprintTitle), env),
              locale,
              getPreprintIdFromUuid: withEnv(getPreprintIdFromLegacyPreviewUuid, env),
              getProfileIdFromUuid: withEnv(getProfileIdFromLegacyPreviewUuid, env),
              getPreprintId: withEnv(EffectToFpts.toReaderTaskEitherK(Preprints.getPreprintId), env),
              popFromSession: withEnv(
                (key: string) =>
                  typeof sessionId === 'string'
                    ? Keyv.popFromSession(sessionId, key)
                    : RTE.left('unavailable' as const),
                env,
              ),
              resolvePreprintId: withEnv(EffectToFpts.toReaderTaskEitherK(Preprints.resolvePreprintId), env),
              sendEmail: withEnv(sendEmailWithNodemailer, env),
            })),
            R.local((appEnv: ConfigEnv): ConfigEnv & L.LoggerEnv & { runtime: AppRuntime } => ({
              ...appEnv,
              logger,
              runtime,
            })),
            Function.apply(config),
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
