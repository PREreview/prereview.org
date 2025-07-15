import type { HttpClient } from '@effect/platform'
import { Context, Data, Effect, identity, Layer, pipe } from 'effect'
import type { Html } from '../html.js'
import { getPage, type GhostApi } from './GetPage.js'

export { GhostApi } from './GetPage.js'

export class PageIsNotFound extends Data.TaggedError('PageIsNotFound') {}

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: string) => Effect.Effect<Html, PageIsUnavailable | PageIsNotFound>
>() {}

export const getPageFromGhost = Effect.serviceFunctionEffect(GetPageFromGhost, identity)

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
    const context = yield* Effect.context<GhostApi | HttpClient.HttpClient>()

    return id => pipe(loadWithCachingClient(id), Effect.provide(context))
  }),
)
