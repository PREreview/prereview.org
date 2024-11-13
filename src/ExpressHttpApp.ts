import { type HttpApp, HttpMiddleware, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { NodeHttpServerRequest } from '@effect/platform-node'
import { Effect, Option } from 'effect'
import express, { type ErrorRequestHandler } from 'express'
import { Express, Locale, LoggedInUser } from './Context.js'

export const ExpressHttpApp: HttpApp.Default<never, Express | HttpServerRequest.HttpServerRequest | Locale> =
  Effect.gen(function* () {
    const expressApp = yield* Express
    const request = yield* HttpServerRequest.HttpServerRequest

    const nodeRequest = NodeHttpServerRequest.toIncomingMessage(request)
    const nodeResponse = NodeHttpServerRequest.toServerResponse(request)
    const locale = yield* Locale
    const user = yield* Effect.serviceOption(LoggedInUser)

    return yield* Effect.async<HttpServerResponse.HttpServerResponse>(resume => {
      nodeResponse.once('close', () => resume(Effect.succeed(HttpServerResponse.empty())))

      express()
        .use(expressApp({ locale, user: Option.getOrUndefined(user) }))
        .use(((error, req, res, next) => {
          if (error instanceof Error && 'code' in error && error.code === 'ERR_HTTP_HEADERS_SENT') {
            return next()
          }

          next(error)
        }) satisfies ErrorRequestHandler)(nodeRequest, nodeResponse)
    }).pipe(HttpMiddleware.withLoggerDisabled)
  })
