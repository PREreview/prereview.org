import { Effect } from 'effect'
import { Locale } from './Context.ts'
import { HavingProblemsPage } from './HavingProblemsPage/index.ts'
import type { SupportedLocale } from './locales/index.ts'
import { NoPermissionPage } from './NoPermissionPage/index.ts'
import { PageNotFound } from './PageNotFound/index.ts'

/** @deprecated */
export const pageNotFound = (locale: SupportedLocale) =>
  Effect.runSync(Effect.provideService(PageNotFound, Locale, locale))

/** @deprecated */
export const havingProblemsPage = (locale: SupportedLocale) =>
  Effect.runSync(Effect.provideService(HavingProblemsPage, Locale, locale))

/** @deprecated */
export const noPermissionPage = (locale: SupportedLocale) =>
  Effect.runSync(Effect.provideService(NoPermissionPage, Locale, locale))
