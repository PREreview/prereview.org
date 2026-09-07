import { Context, Effect, flow, Layer } from 'effect'
import type { Locale } from '../Context.ts'
import { ContentfulPages } from '../ExternalInteractions/ContentfulPages/index.ts'
import { GhostPage } from '../ExternalInteractions/index.ts'
import * as FeatureFlags from '../FeatureFlags.ts'
import { UnableToQuery } from '../Queries.ts'
import type { Slug } from '../types/Slug.ts'
import type { Page } from './Types.ts'

export class CmsContent extends Context.Tag('CmsContent')<
  CmsContent,
  {
    getPage: (slug: Slug) => Effect.Effect<Page, UnableToQuery, Locale>
  }
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const loadPagesFromContentful = yield* FeatureFlags.loadPagesFromContentful
      const getPageFromGhost = yield* GhostPage.GetPageFromGhost
      const contentfulPages = yield* ContentfulPages

      if (loadPagesFromContentful) {
        return {
          getPage: contentfulPages.getPage,
        }
      }

      return {
        getPage: flow(
          getPageFromGhost,
          Effect.catchTag('PageIsUnavailable', error => new UnableToQuery({ cause: error })),
        ),
      }
    }),
  )
}
