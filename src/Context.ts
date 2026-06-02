import { Context, type HashSet, type Redacted } from 'effect'
import type * as Keyv from './keyv.ts'
import type { SupportedLocale, UserSelectableLocale } from './locales/index.ts'
import type { NonEmptyString } from './types/index.ts'
import type { FlashMessageSchema } from './WebApp/Response/index.ts' // eslint-disable-line import/no-internal-modules

export class AllowSiteCrawlers extends Context.Tag('AllowSiteCrawlers')<AllowSiteCrawlers, boolean>() {}

export class Locale extends Context.Tag('Locale')<Locale, SupportedLocale>() {}

export class EnabledLocales extends Context.Tag('EnabledLocales')<
  EnabledLocales,
  HashSet.HashSet<UserSelectableLocale>
>() {}

export class FlashMessage extends Context.Tag('CurrentFlashMessage')<FlashMessage, typeof FlashMessageSchema.Type>() {}

export class SessionSecret extends Context.Tag('SessionSecret')<SessionSecret, Redacted.Redacted>() {}

export class SessionStore extends Context.Tag('SessionStore')<SessionStore, { cookie: string; store: Keyv.Keyv }>() {}

export class ScietyListToken extends Context.Tag('ScietyListToken')<
  ScietyListToken,
  Redacted.Redacted<NonEmptyString.NonEmptyString>
>() {}
