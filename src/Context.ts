import { Context, type Redacted } from 'effect'
import type { LoggerEnv } from 'logger-fp-ts'
import type { app, ConfigEnv } from './app.js'
import type { EnvVars } from './env.js'
import type { SupportedLocale } from './locales/index.js'
import type { FlashMessageSchema } from './response.js'

export class DeprecatedEnvVars extends Context.Tag('DeprecatedEnvVars')<DeprecatedEnvVars, EnvVars>() {}

export class DeprecatedLoggerEnv extends Context.Tag('DeprecatedLoggerEnv')<DeprecatedLoggerEnv, LoggerEnv>() {}

export class Express extends Context.Tag('Express')<Express, ReturnType<typeof app>>() {}

export class ExpressConfig extends Context.Tag('ExpressConfig')<
  ExpressConfig,
  Omit<
    ConfigEnv,
    | 'clock'
    | 'fetch'
    | 'generateUuid'
    | 'legacyPrereviewApi'
    | 'nodemailer'
    | 'publicUrl'
    | 'secret'
    | 'templatePage'
    | 'useCrowdinInContext'
  >
>() {}

export class Locale extends Context.Tag('Locale')<Locale, SupportedLocale>() {}

export class FlashMessage extends Context.Tag('CurrentFlashMessage')<FlashMessage, typeof FlashMessageSchema.Type>() {}

export class SessionSecret extends Context.Tag('SessionSecret')<SessionSecret, Redacted.Redacted>() {}
