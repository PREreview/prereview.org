import { type HttpClientResponse, UrlParams } from '@effect/platform'
import { diff } from 'deep-object-diff'
import { type DateTime, Effect, pipe } from 'effect'
import type * as HttpCache from '../HttpCache.js'

export const serializationErrorChecking = (
  httpCache: typeof HttpCache.HttpCache.Service,
): typeof HttpCache.HttpCache.Service => ({
  ...httpCache,
  set: (response: HttpClientResponse.HttpClientResponse, staleAt: DateTime.Utc) =>
    pipe(
      httpCache.set(response, staleAt),
      Effect.tap(() =>
        Effect.gen(function* () {
          const logAnnotations = {
            url: response.request.url,
            urlParams: UrlParams.toString(response.request.urlParams),
            method: response.request.method,
          }
          const cachedValue = yield* pipe(
            httpCache.get(response.request),
            Effect.orElseSucceed(() => undefined),
          )
          if (cachedValue === undefined) {
            return yield* Effect.logError('cache entry not found').pipe(Effect.annotateLogs(logAnnotations))
          }
          const origResponse = {
            status: response.status,
            headers: { ...response.headers },
            body: yield* response.text,
          }
          const cachedResponse = {
            status: cachedValue.response.status,
            headers: cachedValue.response.headers,
            body: yield* cachedValue.response.text,
          }
          const difference = diff(origResponse, cachedResponse)
          function replacer(_: unknown, value: unknown) {
            if (value == undefined) {
              return null
            }
            return value
          }
          if (Object.keys(difference).length !== 0) {
            return yield* Effect.logError('cached response does not equal original').pipe(
              Effect.annotateLogs({ ...logAnnotations, diff: JSON.parse(JSON.stringify(difference, replacer)) }),
            )
          }
        }),
      ),
    ),
})
