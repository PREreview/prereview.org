import { type HttpApp, HttpServerError, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { NodeHttpServerRequest } from '@effect/platform-node'
import { type ConfigError, Effect } from 'effect'
import express, { type ErrorRequestHandler } from 'express'
import httpErrors from 'http-errors'
import { type DeprecatedLoggerEnv, Express, Locale } from './Context.ts'
import * as StatusCodes from './StatusCodes.ts'

export const ExpressHttpApp: HttpApp.Default<
  ConfigError.ConfigError | HttpServerError.RouteNotFound,
  DeprecatedLoggerEnv | Express | HttpServerRequest.HttpServerRequest | Locale
> = Effect.gen(function* () {
  const expressApp = yield* Express
  const request = yield* HttpServerRequest.HttpServerRequest

  const nodeRequest = NodeHttpServerRequest.toIncomingMessage(request)
  nodeRequest.url = request.url
  const nodeResponse = NodeHttpServerRequest.toServerResponse(request)
  const locale = yield* Locale

  return yield* Effect.async<HttpServerResponse.HttpServerResponse, HttpServerError.RouteNotFound>(resume => {
    nodeResponse.once('close', () =>
      resume(
        Effect.succeed(
          HttpServerResponse.empty({ status: nodeResponse.writableFinished ? nodeResponse.statusCode : 499 }),
        ),
      ),
    )

    express()
      .use(expressApp({ locale }))
      .use(((error, req, res, next) => {
        if (error instanceof Error && 'code' in error && error.code === 'ERR_HTTP_HEADERS_SENT') {
          return next()
        }

        if (res.headersSent) {
          return next(error)
        }

        if (httpErrors.isHttpError(error) && error.status === StatusCodes.NotFound) {
          return resume(Effect.fail(new HttpServerError.RouteNotFound({ request })))
        }

        resume(Effect.die(error))
      }) satisfies ErrorRequestHandler)(nodeRequest, nodeResponse)
  })
})
