import { Context, Effect, flow, Layer } from 'effect'
import type { Locale } from '../Context.ts'
import { GhostPage } from '../ExternalInteractions/index.ts'
import { UnableToQuery } from '../Queries.ts'
import type { Page, PageId } from './Types.ts'

export class CmsContent extends Context.Tag('CmsContent')<
  CmsContent,
  {
    getPage: (pageId: PageId) => Effect.Effect<Page, UnableToQuery, Locale>
  }
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const getPageFromGhost = yield* GhostPage.GetPageFromGhost

      return {
        getPage: flow(
          getPageFromGhost,
          Effect.catchTag('PageIsUnavailable', error => new UnableToQuery({ cause: error })),
        ),
      }
    }),
  )
}
