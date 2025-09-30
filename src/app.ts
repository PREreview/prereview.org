import { Function, pipe, type Runtime } from 'effect'
import express from 'express'
import asyncHandler from 'express-async-handler'
import * as R from 'fp-ts/lib/Reader.js'
import type { HttpError } from 'http-errors'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { toRequestHandler } from 'hyper-ts/lib/express.js'
import type * as L from 'logger-fp-ts'
import * as EffectToFpts from './EffectToFpts.ts'
import { withEnv } from './Fpts.ts'
import type * as Keyv from './keyv.ts'
// eslint-disable-next-line import/no-internal-modules
import * as LocaleCookie from './HttpMiddleware/LocaleCookie.ts'
import * as Preprints from './Preprints/index.ts'
// eslint-disable-next-line import/no-internal-modules
import { type LegacyEnv, legacyRoutes } from './Router/NonEffectRouter/legacy-routes.ts'
import { type RouterEnv, routes } from './app-router.ts'
import { getUserOnboarding } from './keyv.ts'
import { getPreprintIdFromLegacyPreviewUuid, getProfileIdFromLegacyPreviewUuid } from './legacy-prereview.ts'
import { isUserSelectableLocale, type SupportedLocale } from './locales/index.ts'
import { handleResponse } from './response.ts'
import { securityHeaders } from './securityHeaders.ts'
import type { User } from './user.ts'
import type { WasPrereviewRemovedEnv } from './zenodo.ts'

export type ConfigEnv = Omit<
  RouterEnv & LegacyEnv,
  'getPreprintId' | 'getUserOnboarding' | 'locale' | 'logger' | 'getPreprintIdFromUuid' | 'getProfileIdFromUuid'
> &
  Keyv.UserOnboardingStoreEnv &
  WasPrereviewRemovedEnv & {
    allowSiteCrawlers: boolean
    useCrowdinInContext: boolean
  }

const appMiddleware: RM.ReaderMiddleware<RouterEnv & LegacyEnv, StatusOpen, ResponseEnded, HttpError<404>, void> = pipe(
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
)

export type AppContext = Preprints.Preprints

type AppRuntime = Runtime.Runtime<AppContext>

export const app = (config: ConfigEnv) => {
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
              user,
              getUserOnboarding: withEnv(getUserOnboarding, env),
              locale,
              getPreprintIdFromUuid: withEnv(getPreprintIdFromLegacyPreviewUuid, env),
              getProfileIdFromUuid: withEnv(getProfileIdFromLegacyPreviewUuid, env),
              getPreprintId: withEnv(EffectToFpts.toReaderTaskEitherK(Preprints.getPreprintId), env),
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
