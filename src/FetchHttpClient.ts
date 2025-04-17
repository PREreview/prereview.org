import {
  FetchHttpClient,
  HttpBody,
  type HttpClient,
  type HttpClientError,
  HttpClientRequest,
  type HttpClientResponse,
  HttpMethod,
} from '@effect/platform'
import { Effect, Either, identity, pipe, Runtime } from 'effect'
import * as CachingHttpClient from './CachingHttpClient/index.js'
import * as LoggingHttpClient from './LoggingHttpClient.js'

export const Fetch = FetchHttpClient.Fetch

export const makeFetch = Effect.gen(function* () {
  return yield* transmogrifyHttpClient
})

const transmogrifyHttpClient: Effect.Effect<
  typeof globalThis.fetch,
  never,
  HttpClient.HttpClient | CachingHttpClient.HttpCache
> = Effect.gen(function* () {
  const client = yield* Effect.provide(
    CachingHttpClient.CachingHttpClient('10 seconds', '30 seconds'),
    LoggingHttpClient.layer,
  )
  const runtime = yield* Effect.runtime()

  return (input, init) =>
    Runtime.runPromise(
      runtime,
      pipe(convertRequest(input, init), Effect.andThen(client.execute), Effect.andThen(convertResponse), Effect.either),
      { signal: init?.signal ?? undefined },
    ).then(Either.getOrThrowWith(identity))
})

const convertRequest = (
  input: string | URL | globalThis.Request,
  init?: RequestInit,
): Effect.Effect<HttpClientRequest.HttpClientRequest, Error> =>
  Effect.gen(function* () {
    const request = new Request(input, init)
    const method = request.method

    if (!HttpMethod.isHttpMethod(method)) {
      return yield* Effect.fail(new Error('Unsupported method'))
    }

    if (!HttpMethod.hasBody(method)) {
      return HttpClientRequest.make(method)(request.url, { headers: request.headers })
    }

    const body = yield* Effect.tryPromise({
      try: () => request.text().then(text => HttpBody.text(text, request.headers.get('Content-Type') ?? undefined)),
      catch: () => new Error('Unable to read body'),
    })

    return HttpClientRequest.make(method)(request.url, { headers: request.headers, body })
  })

const convertResponse = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<Response, HttpClientError.ResponseError> =>
  pipe(
    response.text,
    Effect.andThen(body => new Response(body, { headers: response.headers, status: response.status })),
  )
