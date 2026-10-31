import {
  FetchHttpClient,
  HttpBody,
  HttpClient,
  type HttpClientError,
  HttpClientRequest,
  type HttpClientResponse,
  HttpMethod,
} from 'effect/http'
import { Effect, identity, pipe, Result } from 'effect'

export const Fetch = FetchHttpClient.Fetch

export const makeFetch: Effect.Effect<typeof globalThis.fetch, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const context = yield* Effect.context()

  return (input, init) =>
    Effect.runPromiseWith(context)(
      pipe(
        convertRequest(input, init),
        Effect.andThen(
          (['error', 'manual'].includes(init?.redirect ?? 'follow') ? client : HttpClient.followRedirects(client))
            .execute,
        ),
        Effect.andThen(convertResponse),
        Effect.result,
      ),
      { signal: init?.signal ?? undefined },
    ).then(Result.getOrThrowWith(identity))
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
): Effect.Effect<Response, HttpClientError.HttpClientError> =>
  pipe(
    response.text,
    Effect.map(body => new Response(body, { headers: response.headers, status: response.status })),
  )
