import { type HttpApp, type HttpClient, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { NodeHttpServerRequest } from '@effect/platform-node'
import { type ConfigError, Effect, HashMap, Option, pipe } from 'effect'
import express, { type ErrorRequestHandler } from 'express'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import type { LogEntry } from 'logger-fp-ts'
import * as L from 'logging-ts/lib/IO.js'
import type { HttpCache } from './CachingHttpClient/index.js'
import { DeprecatedLoggerEnv, Express, Locale } from './Context.js'
import { makeFetch } from './fetch.js'
import { LoggedInUser } from './user.js'

export const ExpressHttpApp: HttpApp.Default<
  ConfigError.ConfigError,
  DeprecatedLoggerEnv | Express | HttpClient.HttpClient | HttpCache | HttpServerRequest.HttpServerRequest | Locale
> = Effect.gen(function* () {
  const expressApp = yield* Express
  const loggerEnv = yield* DeprecatedLoggerEnv
  const request = yield* HttpServerRequest.HttpServerRequest
  const runtime = yield* Effect.runtime<Locale>()

  const nodeRequest = NodeHttpServerRequest.toIncomingMessage(request)
  const nodeResponse = NodeHttpServerRequest.toServerResponse(request)
  const fetch = yield* makeFetch
  const locale = yield* Locale
  const user = yield* Effect.serviceOption(LoggedInUser)
  const logAnnotations = yield* Effect.logAnnotations

  const logger = pipe(
    loggerEnv.logger,
    L.contramap((entry: LogEntry) => ({
      ...entry,
      payload: { ...(Object.fromEntries(HashMap.toEntries(logAnnotations)) as JsonRecord), ...entry.payload },
    })),
  )

  return yield* Effect.async<HttpServerResponse.HttpServerResponse>(resume => {
    nodeResponse.once('close', () =>
      resume(
        Effect.succeed(
          HttpServerResponse.empty({ status: nodeResponse.writableFinished ? nodeResponse.statusCode : 499 }),
        ),
      ),
    )

    express()
      .use(expressApp({ fetch, locale, logger, runtime, user: Option.getOrUndefined(user) }))
      .use(((error, req, res, next) => {
        if (error instanceof Error && 'code' in error && error.code === 'ERR_HTTP_HEADERS_SENT') {
          return next()
        }

        next(error)
      }) satisfies ErrorRequestHandler)(nodeRequest, nodeResponse)
  })
})
