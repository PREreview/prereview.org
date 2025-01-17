import { FetchHttpClient, Headers, HttpClient, HttpClientRequest, UrlParams } from '@effect/platform'
import { Context, Data, Effect, flow, Layer, Match, pipe } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as FptsToEffect from './FptsToEffect.js'
import { getPage, getPageWithEffect, GhostApi } from './ghost.js'
import type { Html } from './html.js'

export class PageIsNotFound extends Data.TaggedError('PageIsNotFound') {}

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: string) => Effect.Effect<Html, PageIsUnavailable | PageIsNotFound>
>() {}

export interface GetPageFromGhostEnv {
  getPageFromGhost: (id: string) => TE.TaskEither<'unavailable' | 'not-found', Html>
}

export const getPageFromGhost = (id: string) =>
  R.asks(({ getPageFromGhost }: GetPageFromGhostEnv) => getPageFromGhost(id))

const loadWithCachingClient = (id: string) =>
  pipe(
    getPageWithEffect(id),
    Effect.tapError(error => Effect.logError('Failed to load ghost page').pipe(Effect.annotateLogs({ error }))),
    Effect.ignore,
  )

const legacyFetch = (ghostApi: typeof GhostApi.Service, fetch: typeof FetchHttpClient.Fetch.Service) => (id: string) =>
  pipe(
    FptsToEffect.readerTaskEither(getPage(id), {
      fetch,
      ghostApi,
    }),
    Effect.mapError(
      flow(
        Match.value,
        Match.when('not-found', () => new PageIsNotFound()),
        Match.when('unavailable', () => new PageIsUnavailable()),
        Match.exhaustive,
      ),
    ),
  )

const loggingHttpClient = (client: HttpClient.HttpClient) =>
  pipe(
    client,
    HttpClient.mapRequest(
      HttpClientRequest.setHeaders({
        'User-Agent': 'PREreview (https://prereview.org/; mailto:engineering@prereview.org)',
      }),
    ),
    HttpClient.tapRequest(request =>
      Effect.logDebug('Sending HTTP Request').pipe(
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

export const layer = Layer.effect(
  GetPageFromGhost,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const fetch = yield* FetchHttpClient.Fetch
    const ghostApi = yield* GhostApi
    return id =>
      pipe(
        Effect.if(id === '6154aa157741400e8722bb14', {
          onTrue: () =>
            pipe(
              loadWithCachingClient(id),
              Effect.provideService(GhostApi, ghostApi),
              Effect.provideService(HttpClient.HttpClient, loggingHttpClient(httpClient)),
            ),
          onFalse: () => Effect.void,
        }),
        Effect.andThen(legacyFetch(ghostApi, fetch)(id)),
      )
  }),
)
