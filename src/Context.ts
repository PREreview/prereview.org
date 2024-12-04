import { Context } from 'effect'
import type { Redis as IoRedis } from 'ioredis'
import type { LoggerEnv } from 'logger-fp-ts'
import type { Transporter } from 'nodemailer'
import type { app, ConfigEnv } from './app.js'
import type { EnvVars } from './env.js'
import type { EventStore as EventStoreService } from './EventStore.js'
import type { SleepEnv } from './fetch.js'
import type { SupportedLocale } from './locales/index.js'
import type { FlashMessageSchema } from './response.js'
import type { User } from './user.js'

export class DeprecatedEnvVars extends Context.Tag('DeprecatedEnvVars')<DeprecatedEnvVars, EnvVars>() {}

export class DeprecatedLoggerEnv extends Context.Tag('DeprecatedLoggerEnv')<DeprecatedLoggerEnv, LoggerEnv>() {}

export class DeprecatedSleepEnv extends Context.Tag('DeprecatedSleepEnv')<DeprecatedSleepEnv, SleepEnv>() {}

export class Express extends Context.Tag('Express')<Express, ReturnType<typeof app>>() {}

export class Nodemailer extends Context.Tag('Nodemailer')<Nodemailer, Transporter<unknown>>() {}

export class ExpressConfig extends Context.Tag('ExpressConfig')<
  ExpressConfig,
  Omit<ConfigEnv, 'canWriteComments' | 'clock' | 'fetch' | 'nodemailer' | 'publicUrl' | 'sleep'>
>() {}

export class Locale extends Context.Tag('Locale')<Locale, SupportedLocale>() {}

export class LoggedInUser extends Context.Tag('User')<LoggedInUser, User>() {}

export class Redis extends Context.Tag('Redis')<Redis, IoRedis>() {}

export class EventStore extends Context.Tag('EventStore')<EventStore, EventStoreService>() {}

export class FlashMessage extends Context.Tag('CurrentFlashMessage')<FlashMessage, typeof FlashMessageSchema.Type>() {}

export class PublicUrl extends Context.Tag('PublicUrl')<PublicUrl, URL>() {}
