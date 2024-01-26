import type * as F from 'fetch-fp-ts'
import type { Json } from 'fp-ts/Json'
import { constVoid } from 'fp-ts/function'
import * as L from 'logger-fp-ts'

export function useStaleCache<E extends F.FetchEnv>(): (env: E) => E {
  return env => ({ ...env, fetch: (url, init) => env.fetch(url, { cache: 'force-cache', ...init }) })
}

export function reloadCache<E extends F.FetchEnv>(): (env: E) => E {
  return env => ({ ...env, fetch: (url, init) => env.fetch(url, { ...init, cache: 'reload' }) })
}

export function revalidateIfStale<E extends F.FetchEnv>(): (env: E) => E {
  const openRequests = new Set<string>()

  return env => ({
    ...env,
    fetch: async (url, init) => {
      const response = await env.fetch(url, init)

      if (response.headers.get('x-local-cache-status') === 'stale' && !openRequests.has(url)) {
        openRequests.add(url)

        void env
          .fetch(url, { ...init, cache: 'no-cache' })
          .then(response => response.text())
          .catch(constVoid)
          .finally(() => openRequests.delete(url))
      }

      return response
    },
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
        .catch(error => {
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
