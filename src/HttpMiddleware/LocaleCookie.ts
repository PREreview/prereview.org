import { HttpServerRequest, HttpServerResponse } from 'effect/http'
import { Effect, pipe, Schema } from 'effect'
import { EnabledLocales } from '../Context.ts'
import type { UserSelectableLocale } from '../locales/index.ts'

export const setLocaleCookie = (locale: UserSelectableLocale) =>
  HttpServerResponse.setCookie('locale', locale, { path: '/' })

export const getLocaleFromCookie = Effect.gen(function* () {
  const enabledLocales = yield* EnabledLocales

  return yield* pipe(
    HttpServerRequest.schemaCookies(Schema.Struct({ locale: Schema.Literals([...enabledLocales]) })),
    Effect.map(({ locale }) => locale),
    Effect.option,
  )
})
