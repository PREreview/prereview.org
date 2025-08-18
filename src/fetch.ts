import type * as F from 'fetch-fp-ts'
import type { Json } from 'fp-ts/lib/Json.js'
import * as L from 'logger-fp-ts'

export function useStaleCache<E extends F.FetchEnv>(): (env: E) => E {
  return env => ({ ...env, fetch: (url, init) => env.fetch(url, { cache: 'force-cache', ...init }) })
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
