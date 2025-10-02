import { Context, type Redacted } from 'effect'
import type { LoggerEnv } from 'logger-fp-ts'
import type { app, ConfigEnv } from './app.ts'
import type { SlackOAuthEnv } from './connect-slack-page/index.ts'
import type { EnvVars } from './env.ts'
import type * as Keyv from './keyv.ts'
import type { SupportedLocale } from './locales/index.ts'
import type { FlashMessageSchema } from './response.ts'
import type { NonEmptyString } from './types/index.ts'
import type { FormStoreEnv } from './write-review/index.ts'

export class DeprecatedEnvVars extends Context.Tag('DeprecatedEnvVars')<DeprecatedEnvVars, EnvVars>() {}

export class DeprecatedLoggerEnv extends Context.Tag('DeprecatedLoggerEnv')<DeprecatedLoggerEnv, LoggerEnv>() {}

export class Express extends Context.Tag('Express')<Express, ReturnType<typeof app>>() {}

export class ExpressConfig extends Context.Tag('ExpressConfig')<
  ExpressConfig,
  Omit<
    ConfigEnv,
    | 'allowSiteCrawlers'
    | 'clock'
    | 'fetch'
    | 'isUserBlocked'
    | 'legacyPrereviewApi'
    | 'publicUrl'
    | 'secret'
    | 'sessionCookie'
    | 'sessionStore'
    | 'templatePage'
    | 'useCrowdinInContext'
  > &
    Keyv.AvatarStoreEnv &
    Keyv.AuthorInviteStoreEnv &
    Keyv.CareerStageStoreEnv &
    Keyv.ContactEmailAddressStoreEnv &
    Keyv.IsOpenForRequestsStoreEnv &
    Keyv.LanguagesStoreEnv &
    Keyv.LocationStoreEnv &
    Keyv.OrcidTokenStoreEnv &
    Keyv.ResearchInterestsStoreEnv &
    Keyv.ReviewRequestStoreEnv &
    Keyv.SlackUserIdStoreEnv &
    SlackOAuthEnv &
    FormStoreEnv
>() {}

export class AllowSiteCrawlers extends Context.Tag('AllowSiteCrawlers')<AllowSiteCrawlers, boolean>() {}

export class Locale extends Context.Tag('Locale')<Locale, SupportedLocale>() {}

export class FlashMessage extends Context.Tag('CurrentFlashMessage')<FlashMessage, typeof FlashMessageSchema.Type>() {}

export class SessionSecret extends Context.Tag('SessionSecret')<SessionSecret, Redacted.Redacted>() {}

export class SessionStore extends Context.Tag('SessionStore')<SessionStore, { cookie: string; store: Keyv.Keyv }>() {}

export class ScietyListToken extends Context.Tag('ScietyListToken')<
  ScietyListToken,
  Redacted.Redacted<NonEmptyString.NonEmptyString>
>() {}
