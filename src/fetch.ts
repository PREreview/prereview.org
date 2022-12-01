import * as F from 'fetch-fp-ts'
import { constVoid } from 'fp-ts/function'
import * as L from 'logger-fp-ts'
import { ZenodoEnv } from 'zenodo-ts'

export function useStaleCache(env: ZenodoEnv): ZenodoEnv
export function useStaleCache(env: F.FetchEnv): F.FetchEnv
export function useStaleCache<E extends F.FetchEnv>(env: E): E {
  return { ...env, fetch: (url, init) => env.fetch(url, { cache: 'force-cache', ...init }) }
}

export function revalidateIfStale(env: ZenodoEnv): ZenodoEnv
export function revalidateIfStale(env: F.FetchEnv): F.FetchEnv
export function revalidateIfStale<E extends F.FetchEnv>(env: E): E {
  return {
    ...env,
    fetch: async (url, init) => {
      const response = await env.fetch(url, init)

      if (response.headers.get('x-local-cache-status') === 'stale') {
        void env
          .fetch(url, { ...init, cache: 'no-cache' })
          .then(response => response.text())
          .catch(constVoid)
      }

      return response
    },
  }
}

export function timeoutRequest<E extends F.FetchEnv>(timeout: number): (env: E) => E {
  return env => ({
    ...env,
    fetch: async (url, init) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        return await env.fetch(url, { signal: controller.signal, ...init })
      } finally {
        clearTimeout(timeoutId)
      }
    },
  })
}

export function logFetch<E extends F.FetchEnv & L.LoggerEnv>(env: E): E {
  return {
    ...env,
    fetch: async (url, init) => {
      L.debugP('Sending HTTP request')({
        url,
        method: init.method,
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
  }
}
