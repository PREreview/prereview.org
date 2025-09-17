import { type HttpApp, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { NodeHttpServerRequest } from '@effect/platform-node'
import { type ConfigError, Effect, HashMap, Option, pipe } from 'effect'
import express, { type ErrorRequestHandler } from 'express'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import type { LogEntry } from 'logger-fp-ts'
import * as L from 'logging-ts/lib/IO.js'
import type { AppContext } from './app.js'
import { DeprecatedLoggerEnv, Express, Locale } from './Context.js'
import { LoggedInUser } from './user.js'

export const ExpressHttpApp: HttpApp.Default<
  ConfigError.ConfigError,
  DeprecatedLoggerEnv | Express | HttpServerRequest.HttpServerRequest | AppContext
> = Effect.gen(function* () {
  const expressApp = yield* Express
  const loggerEnv = yield* DeprecatedLoggerEnv
  const request = yield* HttpServerRequest.HttpServerRequest
  const runtime = yield* Effect.runtime<AppContext>()

  const nodeRequest = NodeHttpServerRequest.toIncomingMessage(request)
  nodeRequest.url = request.url
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
    nodeResponse.once('close', () =>
      resume(
        Effect.succeed(
          HttpServerResponse.empty({ status: nodeResponse.writableFinished ? nodeResponse.statusCode : 499 }),
        ),
      ),
    )

    express()
      .use(
        expressApp({
          locale,
          logger,
          runtime,
          user: Option.getOrUndefined(user),
        }),
      )
      .use(((error, req, res, next) => {
        if (error instanceof Error && 'code' in error && error.code === 'ERR_HTTP_HEADERS_SENT') {
          return next()
        }

        if (res.headersSent) {
          return next(error)
        }

        resume(Effect.die(error))
      }) satisfies ErrorRequestHandler)(nodeRequest, nodeResponse)
  })
})
