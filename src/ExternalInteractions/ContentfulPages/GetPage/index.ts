import { Array, Effect, pipe, Schema } from 'effect'
import { Contentful, ContentfulIsUnavailable, UsePreviewApi } from '../../../ExternalApis/Contentful/index.ts'
import { UnableToQuery } from '../../../Queries.ts'
import type { Slug } from '../../../types/Slug.ts'
import type { ContentfulPage } from '../Types.ts'
import { EntryToContentfulPage } from './EntryToContentfulPage.ts'

export const GetPage: (slug: Slug, preview?: boolean) => Effect.Effect<ContentfulPage, UnableToQuery, Contentful> =
  Effect.fn('ContentfulPages.getPage')(
    function* (slug, preview = false) {
      yield* Effect.annotateCurrentSpan({ slug })

      const contentful = yield* Contentful

      const { items } = yield* contentful
        .getEntries({
          content_type: 'page',
          limit: 1,
          'fields.slug': slug,
        })
        .pipe(Effect.provideService(UsePreviewApi, preview))

      if (!Array.isNonEmptyReadonlyArray(items)) {
        return yield* new ContentfulIsUnavailable({ cause: 'page is not found' })
      }

      return yield* Schema.decodeUnknown(EntryToContentfulPage)(items[0])
    },
    Effect.catchTag('ContentfulIsUnavailable', 'ParseError', error =>
      pipe(
        Effect.logError('Unable to get page'),
        Effect.annotateLogs({ error }),
        Effect.andThen(new UnableToQuery({ cause: error })),
      ),
    ),
  )
