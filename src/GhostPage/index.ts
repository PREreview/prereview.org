import type { HttpClient } from '@effect/platform'
import { Context, Data, Effect, identity, Layer, pipe } from 'effect'
import type { Html } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { getPage, type GhostApi } from './GetPage.js'

export { GhostApi } from './GetPage.js'

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: PageId) => Effect.Effect<GhostPage, PageIsUnavailable>
>() {}

export const getPageFromGhost = Effect.serviceFunctionEffect(GetPageFromGhost, identity)

export interface GhostPage {
  readonly html: Html
  readonly locale: SupportedLocale
}

type PageId = keyof typeof pageIds

const loadWithCachingClient = (id: PageId) =>
  pipe(
    getPage(pageIds[id]['en-US']),
    Effect.andThen(html => ({ html, locale: 'en-US' as const })),
    Effect.tapError(error => Effect.logError('Failed to load ghost page').pipe(Effect.annotateLogs({ error }))),
    Effect.catchTag('GhostPageNotFound', 'GhostPageUnavailable', () => Effect.fail(new PageIsUnavailable())),
  )

export const layer = Layer.effect(
  GetPageFromGhost,
  Effect.gen(function* () {
    const context = yield* Effect.context<GhostApi | HttpClient.HttpClient>()

    return id => pipe(loadWithCachingClient(id), Effect.provide(context))
  }),
)

const pageIds = {
  AboutUs: {
    'en-US': '6154aa157741400e8722bb14',
  },
  Clubs: {
    'en-US': '64637b4c07fb34a92c7f84ec',
  },
  CodeOfConduct: {
    'en-US': '6154aa157741400e8722bb00',
  },
  EdiaStatement: {
    'en-US': '6154aa157741400e8722bb17',
  },
  Funding: {
    'en-US': '6154aa157741400e8722bb12',
  },
  HowToUse: {
    'en-US': '651d895e07fb34a92c7f8d28',
  },
  LiveReviews: {
    'en-US': '6154aa157741400e8722bb10',
  },
  People: {
    'en-US': '6154aa157741400e8722bb0a',
  },
  PrivacyPolicy: {
    'en-US': '6154aa157741400e8722bb0f',
  },
  Resources: {
    'en-US': '6526c6ae07fb34a92c7f8d6f',
  },
  Trainings: {
    'en-US': '64639b5007fb34a92c7f8518',
  },
}
