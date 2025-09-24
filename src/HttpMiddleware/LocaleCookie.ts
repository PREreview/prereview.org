import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, pipe, Schema } from 'effect'
import type { RequestHandler } from 'express'
import { type UserSelectableLocale, UserSelectableLocales } from '../locales/index.ts'

export const setLocaleCookie = (locale: UserSelectableLocale) =>
  HttpServerResponse.setCookie('locale', locale, { path: '/' })

export const getLocaleFromCookie = pipe(
  HttpServerRequest.schemaCookies(Schema.Struct({ locale: Schema.Literal(...UserSelectableLocales) })),
  Effect.andThen(({ locale }) => locale),
  Effect.option,
)

export const setLocaleCookieInExpress =
  (locale: UserSelectableLocale): RequestHandler =>
  (req, res, next) => {
    res.cookie('locale', locale)

    next()
  }
