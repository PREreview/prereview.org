import { type HttpApp, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { NodeHttpServerRequest } from '@effect/platform-node'
import { Effect } from 'effect'
import { Express } from './Context.js'

export const ExpressHttpApp: HttpApp.Default<never, Express | HttpServerRequest.HttpServerRequest> = Effect.gen(
  function* () {
    const express = yield* Express
    const request = yield* HttpServerRequest.HttpServerRequest

    const nodeRequest = NodeHttpServerRequest.toIncomingMessage(request)
    const nodeResponse = NodeHttpServerRequest.toServerResponse(request)

    express(nodeRequest, nodeResponse)

    yield* Effect.promise(() => new Promise(resolve => nodeResponse.once('close', resolve)))

    return HttpServerResponse.empty()
  },
)
