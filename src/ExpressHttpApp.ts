import { type HttpApp, HttpMiddleware, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { NodeHttpServerRequest } from '@effect/platform-node'
import { Effect, HashMap, Option, pipe } from 'effect'
import express, { type ErrorRequestHandler } from 'express'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import type { LogEntry } from 'logger-fp-ts'
import * as L from 'logging-ts/lib/IO.js'
import { DeprecatedLoggerEnv, Express, Locale, LoggedInUser } from './Context.js'

export const ExpressHttpApp: HttpApp.Default<
  never,
  DeprecatedLoggerEnv | Express | HttpServerRequest.HttpServerRequest | Locale
> = Effect.gen(function* () {
  const expressApp = yield* Express
  const loggerEnv = yield* DeprecatedLoggerEnv
  const request = yield* HttpServerRequest.HttpServerRequest

  const nodeRequest = NodeHttpServerRequest.toIncomingMessage(request)
  const nodeResponse = NodeHttpServerRequest.toServerResponse(request)
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
    nodeResponse.once('close', () => resume(Effect.succeed(HttpServerResponse.empty())))

    express()
      .use(expressApp({ locale, logger, user: Option.getOrUndefined(user) }))
      .use(((error, req, res, next) => {
        if (error instanceof Error && 'code' in error && error.code === 'ERR_HTTP_HEADERS_SENT') {
          return next()
        }

        next(error)
      }) satisfies ErrorRequestHandler)(nodeRequest, nodeResponse)
  }).pipe(HttpMiddleware.withLoggerDisabled)
})
