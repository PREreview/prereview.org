import type { HttpClient } from '@effect/platform'
import { Context, Data, Effect, identity, Layer, pipe } from 'effect'
import type { Html } from '../html.js'
import { getPage, type GhostApi } from './GetPage.js'

export { GhostApi } from './GetPage.js'

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: PageId) => Effect.Effect<Html, PageIsUnavailable>
>() {}

export const getPageFromGhost = Effect.serviceFunctionEffect(GetPageFromGhost, identity)

type PageId = PageIds[keyof PageIds]

const loadWithCachingClient = (id: PageId) =>
  pipe(
    getPage(id),
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

interface PageIds {
  AboutUs: '6154aa157741400e8722bb14'
  Clubs: '64637b4c07fb34a92c7f84ec'
  CodeOfConduct: '6154aa157741400e8722bb00'
  EdiaStatement: '6154aa157741400e8722bb17'
  Funding: '6154aa157741400e8722bb12'
  HowToUse: '651d895e07fb34a92c7f8d28'
  LiveReviews: '6154aa157741400e8722bb10'
  People: '6154aa157741400e8722bb0a'
  PrivacyPolicy: '6154aa157741400e8722bb0f'
  Resources: '6526c6ae07fb34a92c7f8d6f'
  Trainings: '64639b5007fb34a92c7f8518'
}
