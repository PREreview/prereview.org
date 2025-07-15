import type { HttpClient } from '@effect/platform'
import { Context, Data, Effect, identity, Layer, pipe } from 'effect'
import type { Locale } from '../Context.js'
import type { Html } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { getPage, type GhostApi } from './GetPage.js'
import { getGhostIdAndLocaleForPage, type PageId } from './PageIds.js'

export { GhostApi } from './GetPage.js'

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (page: PageId) => Effect.Effect<GhostPage, PageIsUnavailable, Locale>
>() {}

export const getPageFromGhost = Effect.serviceFunctionEffect(GetPageFromGhost, identity)

export interface GhostPage {
  readonly html: Html
  readonly locale: SupportedLocale
}

const loadWithCachingClient = (page: PageId) =>
  pipe(
    getGhostIdAndLocaleForPage(page),
    Effect.bind('html', ({ id }) => getPage(id)),
    Effect.tapError(error => Effect.logError('Failed to load ghost page').pipe(Effect.annotateLogs({ error }))),
    Effect.catchTag('GhostPageNotFound', 'GhostPageUnavailable', () => new PageIsUnavailable()),
  )

export const layer = Layer.effect(
  GetPageFromGhost,
  Effect.gen(function* () {
    const context = yield* Effect.context<GhostApi | HttpClient.HttpClient>()

    return id => pipe(loadWithCachingClient(id), Effect.provide(context))
  }),
)
