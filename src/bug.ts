import {
  FetchHttpClient,
  HttpClient,
  type HttpClientError,
  HttpClientRequest,
  type HttpClientResponse,
} from '@effect/platform'
import { Effect, Logger, LogLevel, pipe, type Scope } from 'effect'

const makeRequest = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient

  yield* pipe(client.execute(HttpClientRequest.make('GET')('https://www.google.com/')), Effect.scoped)
})

const ClientThatMakesASecondRequest: Effect.Effect<HttpClient.HttpClient, never, HttpClient.HttpClient> = Effect.gen(
  function* () {
    const httpClient = yield* pipe(
      HttpClient.HttpClient,
      Effect.andThen(
        HttpClient.transformResponse(
          Effect.tapError(error =>
            Effect.logError('Error sending HTTP request').pipe(
              Effect.annotateLogs({
                reason: error.reason,
                error: error.cause,
              }),
            ),
          ),
        ),
      ),
    )

    const thing = (
      request: Effect.Effect<HttpClientRequest.HttpClientRequest>,
    ): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError, Scope.Scope> =>
      Effect.gen(function* () {
        const req = yield* request

        yield* Effect.forkDaemon(
          Effect.gen(function* () {
            yield* Effect.sleep('3 seconds')

            yield* Effect.logInfo('Requesting again')

            const response = yield* pipe(httpClient.execute(req))

            yield* Effect.logInfo(`Requested again got a ${response.status}`)
          }),
        )

        return yield* pipe(
          httpClient.execute(req),
          Effect.tap(response => Effect.logInfo(`Original got a ${response.status}`)),
        )
      })

    return HttpClient.makeWith(thing, Effect.succeed)
  },
)

const program = pipe(
  makeRequest,
  Effect.provideServiceEffect(HttpClient.HttpClient, ClientThatMakesASecondRequest),
  Effect.provide(FetchHttpClient.layer),
  Logger.withMinimumLogLevel(LogLevel.Debug),
)

Effect.runFork(program)
