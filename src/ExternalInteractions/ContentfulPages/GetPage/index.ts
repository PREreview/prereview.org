import { Array, Effect, pipe } from 'effect'
import type { Locale } from '../../../Context.ts'
import {
  Contentful,
  ContentfulIsUnavailable,
  LinkContext,
  UsePreviewApi,
} from '../../../ExternalApis/Contentful/index.ts'
import { UnableToQuery } from '../../../Queries.ts'
import type { Slug } from '../../../types/Slug.ts'
import type { DynamicEmbedder } from '../DynamicEmbedder.ts'
import type { ContentfulPage } from '../Types.ts'
import { EntryToContentfulPage } from './EntryToContentfulPage.ts'

export const GetPage: (
  slug: Slug,
  preview?: boolean,
) => Effect.Effect<ContentfulPage, UnableToQuery, Contentful | DynamicEmbedder | Locale> = Effect.fn(
  'ContentfulPages.getPage',
)(
  function* (slug) {
    yield* Effect.annotateCurrentSpan({ slug })

    const contentful = yield* Contentful

    const entries = yield* contentful.getEntries({
      content_type: 'page',
      limit: 1,
      'fields.slug': slug,
    })

    if (!Array.isReadonlyArrayNonEmpty(entries.items)) {
      return yield* new ContentfulIsUnavailable({ cause: 'page is not found' })
    }

    return yield* Effect.provideService(EntryToContentfulPage(entries.items[0]), LinkContext, entries)
  },
  (effect, _slug, preview = false) => Effect.provideService(effect, UsePreviewApi, preview),
  Effect.catchTag(
    ['ContentfulIsUnavailable', 'PrereviewIsNotFound', 'PrereviewIsUnavailable', 'PrereviewWasRemoved', 'SchemaError'],
    error =>
      pipe(
        Effect.logError('Unable to get page'),
        Effect.annotateLogs({ error }),
        Effect.andThen(new UnableToQuery({ cause: error })),
      ),
  ),
)
