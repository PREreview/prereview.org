import { Context, Data, Effect, flow, identity, Layer, Scope } from 'effect'
import type { Locale } from '../../Context.ts'
import type { Ghost } from '../../ExternalApis/index.ts'
import type { Html } from '../../html.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { getPage } from './GetPage.ts'
import { getGhostIdAndLocaleForPage, type PageId } from './PageIds.ts'

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
    const context = yield* Effect.andThen(Effect.context<Ghost.Ghost>(), Context.omit(Scope.Scope))

    return flow(
      getGhostIdAndLocaleForPage,
      Effect.bind('html', ({ id }) => getPage(id)),
      Effect.tapError(error => Effect.logError('Failed to load ghost page').pipe(Effect.annotateLogs({ error }))),
      Effect.catchTag('GhostPageNotFound', 'GhostPageUnavailable', () => new PageIsUnavailable()),
      Effect.provide(context),
    )
  }),
)
