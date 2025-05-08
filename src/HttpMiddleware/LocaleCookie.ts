import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, pipe, Schema } from 'effect'
import type { RequestHandler } from 'express'
import { DefaultLocale, SupportedLocales, type SupportedLocale } from '../locales/index.js'

export const setLocaleCookie = (locale: SupportedLocale) =>
  HttpServerResponse.setCookie('locale', locale, { path: '/' })

export const getLocaleFromCookie = pipe(
  HttpServerRequest.schemaCookies(Schema.Struct({ locale: Schema.Literal(...SupportedLocales) })),
  Effect.andThen(({ locale }) => locale),
  Effect.orElseSucceed(() => DefaultLocale),
)

export const setLocaleCookieInExpress =
  (locale: SupportedLocale): RequestHandler =>
  (req, res, next) => {
    res.cookie('locale', locale)

    next()
  }
