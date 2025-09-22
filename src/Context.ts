import { Context, type Redacted } from 'effect'
import type { LoggerEnv } from 'logger-fp-ts'
import type { app, ConfigEnv } from './app.js'
import type { SlackOAuthEnv } from './connect-slack-page/index.js'
import type { EnvVars } from './env.js'
import type * as Keyv from './keyv.js'
import type { SupportedLocale } from './locales/index.js'
import type { FlashMessageSchema } from './response.js'
import type { FormStoreEnv } from './write-review/index.js'

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
    | 'generateUuid'
    | 'legacyPrereviewApi'
    | 'nodemailer'
    | 'publicUrl'
    | 'secret'
    | 'templatePage'
    | 'useCrowdinInContext'
  > &
    Keyv.AvatarStoreEnv &
    Keyv.AuthorInviteStoreEnv &
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
