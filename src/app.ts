import { pipe } from 'effect'
import express from 'express'
import asyncHandler from 'express-async-handler'
import { toRequestHandler } from 'hyper-ts/lib/express.js'
import type * as L from 'logger-fp-ts'
// eslint-disable-next-line import/no-internal-modules
import * as LocaleCookie from './HttpMiddleware/LocaleCookie.ts'
import { routes } from './app-router.ts'
import { isUserSelectableLocale, type SupportedLocale } from './locales/index.ts'
import type { PublicUrlEnv } from './public-url.ts'
import { securityHeaders } from './securityHeaders.ts'

export type ConfigEnv = PublicUrlEnv & {
  allowSiteCrawlers: boolean
  useCrowdinInContext: boolean
}

export const app = (config: ConfigEnv) => {
  return ({ locale }: { locale: SupportedLocale }) => {
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
          return pipe(routes(config), toRequestHandler)(req, res, next)
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
