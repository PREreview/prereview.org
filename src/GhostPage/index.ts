import type { HttpClient } from '@effect/platform'
import { Context, Data, Effect, flow, identity, Layer } from 'effect'
import type { Locale } from '../Context.js'
import type { Ghost } from '../ExternalApis/index.js'
import type { Html } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { getPage } from './GetPage.js'
import { getGhostIdAndLocaleForPage, type PageId } from './PageIds.js'

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (page: PageId) => Effect.Effect<GhostPage, PageIsUnavailable, Locale>
>() {}

export interface GhostPage {
  readonly html: Html
  readonly locale: SupportedLocale
}

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export const getPageFromGhost = Effect.serviceFunctionEffect(GetPageFromGhost, identity)

export const layer = Layer.effect(
  GetPageFromGhost,
  Effect.gen(function* () {
    const context = yield* Effect.context<Ghost.GhostApi | HttpClient.HttpClient>()

    return flow(
      getGhostIdAndLocaleForPage,
      Effect.bind('html', ({ id }) => getPage(id)),
      Effect.tapError(error => Effect.logError('Failed to load ghost page').pipe(Effect.annotateLogs({ error }))),
      Effect.catchTag('GhostPageNotFound', 'GhostPageUnavailable', () => new PageIsUnavailable()),
      Effect.provide(context),
    )
  }),
)
