import { HttpClient } from '@effect/platform'
import { Context, Data, Effect, Layer, pipe } from 'effect'
import { getPage, GhostApi } from './ghost.js'
import type { Html } from './html.js'

export class PageIsNotFound extends Data.TaggedError('PageIsNotFound') {}

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: string) => Effect.Effect<Html, PageIsUnavailable | PageIsNotFound>
>() {}

const loadWithCachingClient = (id: string) =>
  pipe(
    getPage(id),
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
        Effect.provideService(HttpClient.HttpClient, httpClient),
      )
  }),
)
