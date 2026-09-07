import { Context, Data, Effect, flow, identity, Layer, Scope } from 'effect'
import { Clubs } from '../../Clubs/index.ts'
import type { Locale } from '../../Context.ts'
import type { Ghost } from '../../ExternalApis/index.ts'
import type { Html } from '../../html.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import type { Slug } from '../../types/Slug.ts'
import { addListOfClubs } from './AddListOfClubs.ts'
import { getPage } from './GetPage.ts'
import { getGhostIdAndLocaleForPage, getPageIdForSlug } from './PageIds.ts'

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (slug: Slug) => Effect.Effect<GhostPage, PageIsUnavailable, Locale>
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
    const clubs = yield* Clubs
    const context = yield* Effect.andThen(Effect.context<Ghost.Ghost>(), Context.omit(Scope.Scope))

    const listOfClubs = yield* clubs.listClubs

    return flow(
      slug => getPageIdForSlug(slug),
      Effect.andThen(getGhostIdAndLocaleForPage),
      Effect.bind('html', ({ id, locale }) => Effect.andThen(getPage(id), addListOfClubs(locale, listOfClubs))),
      Effect.tapError(error => Effect.logError('Failed to load ghost page').pipe(Effect.annotateLogs({ error }))),
      Effect.catchTag(
        'GhostPageNotFound',
        'GhostPageUnavailable',
        'NoSuchElementException',
        () => new PageIsUnavailable(),
      ),
      Effect.provide(context),
    )
  }),
)
