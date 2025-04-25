import {
  HttpClient,
  type HttpClientError,
  type HttpClientRequest,
  type HttpClientResponse,
  UrlParams,
} from '@effect/platform'
import { Deferred, Effect, Layer, pipe } from 'effect'
import normalizeUrl from 'normalize-url'

export const requestCollapsingHttpClient = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient

  const openRequests = new Map<
    string,
    Deferred.Deferred<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError>
  >()

  return HttpClient.makeWith(
    Effect.fn(function* (req: Effect.Effect<HttpClientRequest.HttpClientRequest>) {
      const request = yield* req

      if (request.method !== 'GET') {
        return yield* httpClient.execute(request)
      }

      const key = keyForRequest(request)
      const openRequest = openRequests.get(key)

      if (openRequest) {
        yield* Effect.logDebug('Collapsing HTTP request').pipe(
          Effect.annotateLogs({
            url: request.url,
            urlParams: UrlParams.toString(request.urlParams),
            method: request.method,
          }),
        )

        return yield* openRequest
      }

      const deferred = yield* Deferred.make<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError>()

      openRequests.set(key, deferred)

      return yield* Effect.ensuring(
        Effect.andThen(Deferred.complete(deferred, httpClient.execute(request)), deferred),
        Effect.sync(() => openRequests.delete(key)),
      )
    }),
    Effect.succeed,
  )
})

export const layer = Layer.effect(HttpClient.HttpClient, requestCollapsingHttpClient)

const keyForRequest = (request: HttpClientRequest.HttpClientRequest): string => {
  const url = new URL(request.url)
  url.search = pipe(UrlParams.fromInput(url.searchParams), UrlParams.appendAll(request.urlParams), UrlParams.toString)

  return normalizeUrl(url.href, { removeTrailingSlash: false, stripHash: true, stripWWW: false })
}
