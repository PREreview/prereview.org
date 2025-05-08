import { HttpServerResponse } from '@effect/platform'
import type { SupportedLocale } from '../locales/index.js'

export const setLocaleCookie = (locale: SupportedLocale) =>
  HttpServerResponse.setCookie('locale', locale, { path: '/' })
