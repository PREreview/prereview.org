import { Context } from 'effect'
import type { Express as ExpressServer } from 'express'
import type { Redis as IoRedis } from 'ioredis'
import type { LoggerEnv } from 'logger-fp-ts'
import type { ConfigEnv } from './app.js'
import type { EnvVars } from './env.js'
import type { EventStore as EventStoreService } from './EventStore.js'
import type { SupportedLocale } from './locales/index.js'

export class DeprecatedEnvVars extends Context.Tag('DeprecatedEnvVars')<DeprecatedEnvVars, EnvVars>() {}

export class DeprecatedLoggerEnv extends Context.Tag('DeprecatedLoggerEnv')<DeprecatedLoggerEnv, LoggerEnv>() {}

export class Express extends Context.Tag('Express')<Express, ExpressServer>() {}

export class ExpressConfig extends Context.Tag('ExpressConfig')<ExpressConfig, ConfigEnv>() {}

export class Locale extends Context.Tag('Locale')<Locale, SupportedLocale>() {}

export class Redis extends Context.Tag('Redis')<Redis, IoRedis>() {}

export class EventStore extends Context.Tag('EventStore')<EventStore, EventStoreService>() {}
