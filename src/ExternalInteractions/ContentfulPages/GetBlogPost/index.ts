import { Array, Effect, pipe } from 'effect'
import type { BlogPost } from '../../../CmsContent/index.ts'
import type { Locale } from '../../../Context.ts'
import { Contentful, ContentfulIsUnavailable, UsePreviewApi } from '../../../ExternalApis/Contentful/index.ts'
import { UnableToQuery } from '../../../Queries.ts'
import type { Slug } from '../../../types/Slug.ts'
import { EntryToContentfulBlogPost } from './EntryToContentfulBlogPost.ts'

export const GetBlogPost: (
  slug: Slug,
  preview?: boolean,
) => Effect.Effect<BlogPost, UnableToQuery, Contentful | Locale> = Effect.fn('ContentfulPages.getBlogPost')(
  function* (slug, preview = false) {
    yield* Effect.annotateCurrentSpan({ slug })

    const contentful = yield* Contentful

    const { items } = yield* contentful
      .getEntries({
        content_type: 'blogPost',
        limit: 1,
        'fields.slug': slug,
      })
      .pipe(Effect.provideService(UsePreviewApi, preview))

    if (!Array.isNonEmptyReadonlyArray(items)) {
      return yield* new ContentfulIsUnavailable({ cause: 'blog post is not found' })
    }

    return yield* EntryToContentfulBlogPost(items[0])
  },
  Effect.catchTag('ContentfulIsUnavailable', 'ParseError', error =>
    pipe(
      Effect.logError('Unable to get blog post'),
      Effect.annotateLogs({ error }),
      Effect.andThen(new UnableToQuery({ cause: error })),
    ),
  ),
)
