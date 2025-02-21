import { type HttpClientResponse, UrlParams } from '@effect/platform'
import { diff } from 'deep-object-diff'
import { type DateTime, Effect, pipe } from 'effect'
import type * as HttpCache from './HttpCache.js'

const diffResponses = (
  responseA: HttpClientResponse.HttpClientResponse,
  responseB: HttpClientResponse.HttpClientResponse,
) =>
  Effect.gen(function* () {
    const diffableA = {
      status: responseA.status,
      headers: { ...responseA.headers },
      body: yield* responseA.text,
    }
    const diffableB = {
      status: responseB.status,
      headers: { ...responseB.headers },
      body: yield* responseB.text,
    }
    return diff(diffableA, diffableB)
  })

const isDifferent = (
  responseA: HttpClientResponse.HttpClientResponse,
  responseB: HttpClientResponse.HttpClientResponse,
) =>
  Effect.gen(function* () {
    const difference = yield* diffResponses(responseA, responseB)
    return Object.keys(difference).length !== 0
  })

const loggableDiff = (
  responseA: HttpClientResponse.HttpClientResponse,
  responseB: HttpClientResponse.HttpClientResponse,
) =>
  Effect.gen(function* () {
    function replacer(_: unknown, value: unknown) {
      if (value == undefined) {
        return null
      }
      return value
    }

    const difference = yield* diffResponses(responseA, responseB)
    return JSON.parse(JSON.stringify(difference, replacer)) as unknown
  })

export const serializationErrorChecking = (
  httpCache: typeof HttpCache.HttpCache.Service,
): typeof HttpCache.HttpCache.Service => ({
  ...httpCache,
  set: (response: HttpClientResponse.HttpClientResponse, staleAt: DateTime.Utc) =>
    Effect.gen(function* () {
      yield* httpCache.set(response, staleAt)

      const logAnnotations = {
        url: response.request.url,
        urlParams: UrlParams.toString(response.request.urlParams),
        method: response.request.method,
      }

      yield* Effect.gen(function* () {
        const cachedValue = yield* pipe(
          httpCache.get(response.request),
          Effect.orElseSucceed(() => undefined),
        )

        if (cachedValue === undefined) {
          yield* pipe('Cache entry not found after setting it', Effect.logError, Effect.annotateLogs(logAnnotations))
          return
        }

        if (yield* isDifferent(response, cachedValue.response)) {
          yield* pipe(
            'Cached response does not equal original',
            Effect.logError,
            Effect.annotateLogs({ ...logAnnotations, diff: yield* loggableDiff(response, cachedValue.response) }),
          )
          yield* httpCache.delete(new URL(response.request.url))
          return
        }
      })
    }),
})
