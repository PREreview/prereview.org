import { Headers, HttpClient, HttpClientRequest, UrlParams } from '@effect/platform'
import { Effect, FiberId, HashSet, pipe } from 'effect'

export const loggingHttpClient: Effect.Effect<HttpClient.HttpClient, never, HttpClient.HttpClient> = Effect.gen(
  function* () {
    const httpClient = yield* HttpClient.HttpClient

    const loggingHttpClient = pipe(
      httpClient,
      HttpClient.mapRequest(
        HttpClientRequest.setHeaders({
          'User-Agent': 'PREreview (https://prereview.org/; mailto:engineering@prereview.org)',
        }),
      ),
      HttpClient.tapRequest(request =>
        Effect.logDebug('Sending HTTP request').pipe(
          Effect.annotateLogs({
            headers: Headers.redact(request.headers, 'authorization'),
            url: request.url,
            urlParams: UrlParams.toString(request.urlParams),
            method: request.method,
          }),
        ),
      ),
      HttpClient.tap(response =>
        Effect.logDebug('Received HTTP response').pipe(
          Effect.annotateLogs({
            status: response.status,
            headers: response.headers,
            url: response.request.url,
            urlParams: UrlParams.toString(response.request.urlParams),
            method: response.request.method,
          }),
        ),
      ),
      HttpClient.tapError(error =>
        Effect.logError('Error sending HTTP request').pipe(
          Effect.annotateLogs({
            reason: error.reason,
            error: error.cause,
            url: error.request.url,
            urlParams: UrlParams.toString(error.request.urlParams),
            method: error.request.method,
          }),
        ),
      ),
    )

    return HttpClient.makeWith(
      Effect.fn(function* (req: Effect.Effect<HttpClientRequest.HttpClientRequest>) {
        const request = yield* req

        return yield* pipe(
          loggingHttpClient.execute(request),
          Effect.onInterrupt(interrupters =>
            pipe(
              Effect.logDebug('HTTP request interrupted'),
              Effect.annotateLogs({ interrupters: HashSet.toValues(HashSet.map(interrupters, FiberId.threadName)) }),
            ),
          ),
        )
      }),
      Effect.succeed,
    )
  },
)
