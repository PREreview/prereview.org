import { Effect } from 'effect'
import { Locale } from './Context.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import type { SupportedLocale } from './locales/index.js'
import { NoPermissionPage } from './NoPermissionPage/index.js'
import { PageNotFound } from './PageNotFound/index.js'

/** @deprecated */
export const pageNotFound = (locale: SupportedLocale) =>
  Effect.runSync(Effect.provideService(PageNotFound, Locale, locale))

/** @deprecated */
export const havingProblemsPage = (locale: SupportedLocale) =>
  Effect.runSync(Effect.provideService(HavingProblemsPage, Locale, locale))

/** @deprecated */
export const noPermissionPage = (locale: SupportedLocale) =>
  Effect.runSync(Effect.provideService(NoPermissionPage, Locale, locale))
