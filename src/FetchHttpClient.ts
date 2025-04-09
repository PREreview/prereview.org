import {
  FetchHttpClient,
  HttpBody,
  type HttpClient,
  type HttpClientError,
  HttpClientRequest,
  type HttpClientResponse,
  HttpMethod,
} from '@effect/platform'
import { Config, Effect, Either, identity, pipe, Runtime } from 'effect'
import fetch from 'make-fetch-happen'
import * as CachingHttpClient from './CachingHttpClient/index.js'
import { PublicUrl } from './public-url.js'

export const Fetch = FetchHttpClient.Fetch

export const makeFetch = Effect.gen(function* () {
  const publicUrl = yield* PublicUrl
  const disableLegacyVolumeBasedCache = yield* Config.withDefault(
    Config.boolean('DISABLE_LEGACY_VOLUME_BASED_CACHE'),
    false,
  )

  if (disableLegacyVolumeBasedCache) {
    return yield* transmogrifyHttpClient
  }

  return fetch.defaults({
    cachePath: 'data/cache',
    headers: {
      'User-Agent': `PREreview (${publicUrl.href}; mailto:engineering@prereview.org)`,
    },
  }) as unknown as typeof globalThis.fetch
})

const transmogrifyHttpClient: Effect.Effect<
  typeof globalThis.fetch,
  never,
  HttpClient.HttpClient | CachingHttpClient.HttpCache
> = Effect.gen(function* () {
  const client = yield* CachingHttpClient.CachingHttpClient('10 seconds')
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
