import {
  HttpBody,
  type HttpClient,
  type HttpClientError,
  HttpClientRequest,
  type HttpClientResponse,
  HttpMethod,
} from '@effect/platform'
import { Duration, Effect, flow, Function, pipe, Runtime } from 'effect'
import type * as F from 'fetch-fp-ts'
import type { Json } from 'fp-ts/lib/Json.js'
import type * as T from 'fp-ts/lib/Task.js'
import * as L from 'logger-fp-ts'
import { CachingHttpClient, type HttpCache } from './CachingHttpClient/index.js'

export interface SleepEnv {
  readonly sleep: (duration: number) => T.Task<void>
}

export function useStaleCache<E extends F.FetchEnv>(): (env: E) => E {
  return env => ({ ...env, fetch: (url, init) => env.fetch(url, { cache: 'force-cache', ...init }) })
}

export function reloadCache<E extends F.FetchEnv>(): (env: E) => E {
  return env => ({ ...env, fetch: (url, init) => env.fetch(url, { ...init, cache: 'reload' }) })
}

export function revalidateIfStale<E extends F.FetchEnv & SleepEnv>(): (env: E) => E {
  const openRequests = new Set<string>()

  return env => ({
    ...env,
    fetch: async (url, init) => {
      const response = await env.fetch(url, init)

      if (
        response.headers.get('x-local-cache-status') === 'stale' &&
        openRequests.size <= 200 &&
        !openRequests.has(url)
      ) {
        openRequests.add(url)

        void env
          .sleep(Duration.toMillis(Duration.min(Duration.times('0.2 seconds', openRequests.size), '30 seconds')))()
          .then(() => env.fetch(url, { ...init, cache: 'no-cache' }))
          .then(response => response.text())
          .catch(Function.constVoid)
          .finally(() => openRequests.delete(url))
      }

      return response
    },
    sleep: env.sleep,
  })
}

export function timeoutRequest<E extends F.FetchEnv>(timeout: number): (env: E) => E {
  return env => ({
    ...env,
    fetch: async (url, init) => env.fetch(url, { signal: AbortSignal.timeout(timeout), ...init }),
  })
}

export function collapseRequests<E extends F.FetchEnv & L.LoggerEnv>(): (env: E) => E {
  const openRequests = new Map<string, Promise<F.Response>>()

  return env => ({
    ...env,
    fetch: async (url, init) => {
      if (init.method !== 'GET') {
        return env.fetch(url, init)
      }

      const key = `${init.cache ?? ' '}${url}`
      const openRequest = openRequests.get(key)

      if (openRequest) {
        L.debugP('Collapsing HTTP request')({
          url,
          method: init.method,
          cache: init.cache as Json,
        })(env)()

        return openRequest.then(response => response.clone())
      }

      const newRequest = env.fetch(url, init).finally(() => openRequests.delete(key))

      openRequests.set(key, newRequest)

      return newRequest
    },
  })
}

export function logFetch<E extends F.FetchEnv & L.LoggerEnv>(): (env: E) => E {
  return env => ({
    ...env,
    fetch: async (url, init) => {
      L.debugP('Sending HTTP request')({
        url,
        method: init.method,
        cache: init.cache as Json,
      })(env)()

      const startTime = Date.now()
      return env
        .fetch(url, init)
        .then(response => {
          const endTime = Date.now()

          L.debugP('Received HTTP response')({
            url: response.url,
            method: init.method,
            status: response.status,
            headers: [...response.headers],
            time: endTime - startTime,
          })(env)()

          return response
        })
        .catch((error: unknown) => {
          const endTime = Date.now()

          L.debugP('Did not receive a HTTP response')({
            url,
            method: init.method,
            time: endTime - startTime,
          })(env)()

          throw error
        })
    },
  })
}

export const makeFetch: Effect.Effect<typeof globalThis.fetch, never, HttpClient.HttpClient | HttpCache> = Effect.gen(
  function* () {
    const client = yield* CachingHttpClient('10 seconds')
    const runtime = yield* Effect.runtime()

    return flow(
      convertRequest,
      Effect.andThen(client.execute),
      Effect.andThen(convertResponse),
      Effect.scoped,
      Runtime.runPromise(runtime),
    )
  },
)

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

    if (HttpMethod.hasBody(method)) {
      return HttpClientRequest.make(method)(request.url, { headers: request.headers })
    }

    const body = yield* Effect.tryPromise({
      try: () => request.text().then(HttpBody.text),
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
