import { HttpClient } from '@effect/platform'
import { Context, Data, Effect, Layer, pipe } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { getPageWithEffect, GhostApi } from './ghost.js'
import type { Html } from './html.js'
import { loggingHttpClient } from './LoggingHttpClient.js'

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
    Effect.catchTag('GhostPageNotFound', () => Effect.fail(new PageIsNotFound())),
    Effect.catchTag('GhostPageUnavailable', () => Effect.fail(new PageIsUnavailable())),
  )

export const layer = Layer.effect(
  GetPageFromGhost,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const ghostApi = yield* GhostApi
    return id =>
      pipe(
        loadWithCachingClient(id),
        Effect.provideService(GhostApi, ghostApi),
        Effect.provideService(HttpClient.HttpClient, loggingHttpClient(httpClient)),
      )
  }),
)
