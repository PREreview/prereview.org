import { Context, type Redacted } from 'effect'
import type * as Keyv from './keyv.ts'
import type { SupportedLocale } from './locales/index.ts'
import type { FlashMessageSchema } from './Response/index.ts'
import type { NonEmptyString } from './types/index.ts'

export class AllowSiteCrawlers extends Context.Tag('AllowSiteCrawlers')<AllowSiteCrawlers, boolean>() {}

export class Locale extends Context.Tag('Locale')<Locale, SupportedLocale>() {}

export class FlashMessage extends Context.Tag('CurrentFlashMessage')<FlashMessage, typeof FlashMessageSchema.Type>() {}

export class SessionSecret extends Context.Tag('SessionSecret')<SessionSecret, Redacted.Redacted>() {}

export class SessionStore extends Context.Tag('SessionStore')<SessionStore, { cookie: string; store: Keyv.Keyv }>() {}

export class ScietyListToken extends Context.Tag('ScietyListToken')<
  ScietyListToken,
  Redacted.Redacted<NonEmptyString.NonEmptyString>
>() {}
