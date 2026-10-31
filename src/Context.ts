import { Context, type HashSet, type Redacted } from 'effect'
import type * as Keyv from './keyv.ts'
import type { SupportedLocale, UserSelectableLocale } from './locales/index.ts'
import type { NonEmptyString } from './types/index.ts'
import type { FlashMessageSchema } from './WebApp/Response/index.ts'

export class AllowSiteCrawlers extends Context.Service<AllowSiteCrawlers, boolean>()('AllowSiteCrawlers') {}

export class Locale extends Context.Service<Locale, SupportedLocale>()('Locale') {}

export class EnabledLocales extends Context.Service<EnabledLocales, HashSet.HashSet<UserSelectableLocale>>()(
  'EnabledLocales',
) {}

export class FlashMessage extends Context.Service<FlashMessage, typeof FlashMessageSchema.Type>()(
  'CurrentFlashMessage',
) {}

export class SessionSecret extends Context.Service<SessionSecret, Redacted.Redacted>()('SessionSecret') {}

export class SessionStore extends Context.Service<SessionStore, { cookie: string; store: Keyv.Keyv }>()(
  'SessionStore',
) {}

export class ScietyListToken extends Context.Service<
  ScietyListToken,
  Redacted.Redacted<NonEmptyString.NonEmptyString>
>()('ScietyListToken') {}
