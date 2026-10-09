import { Array, Effect, pipe } from 'effect'
import { Contentful } from '../../../ExternalApis/Contentful/index.ts'
import { UnableToQuery } from '../../../Queries.ts'
import { PageNotFound } from '../Errors.ts'
import type { ContentfulPageOfBlogPosts } from '../index.ts'
import { EntryToContentfulBlogPostTitle } from './EntryToContentfulBlogPostTitle.ts'

export const GetPageOfBlogPosts: (
  channel: 'blog' | 'newsletter' | 'weeknote',
  page: number,
) => Effect.Effect<ContentfulPageOfBlogPosts, UnableToQuery | PageNotFound, Contentful> = Effect.fn(
  'ContentfulPages.getPageOfBlogPosts',
)(
  function* (channel, page) {
    yield* Effect.annotateCurrentSpan({ page })

    const contentful = yield* Contentful

    const batchIndex = Math.floor((page - 1) / (50 / 5))
    const pageIndexInBatch = (page - 1) % (50 / 5)

    const { items: batchedItems, total } = yield* contentful.getEntries({
      content_type: 'blogPost',
      'fields.channel': channel,
      limit: 50,
      skip: batchIndex * 50,
      order: '-sys.createdAt',
      select: Array.join(
        ['sys', 'fields.title', 'fields.slug', 'fields.heroImage', 'fields.excerpt', 'fields.firstPublishedAtOverride'],
        ',',
      ),
    })

    const items = batchedItems.slice(pageIndexInBatch * 5, (pageIndexInBatch + 1) * 5)

    if (!Array.isNonEmptyReadonlyArray(items)) {
      return yield* new PageNotFound({})
    }

    return {
      currentPage: page,
      totalPages: Math.ceil(total / 5),
      blogPosts: yield* Effect.forEach(items, EntryToContentfulBlogPostTitle, { concurrency: 'inherit' }),
    }
  },
  Effect.catchTag('ContentfulIsUnavailable', 'ParseError', error =>
    pipe(
      Effect.logError('Unable to get page of blog posts'),
      Effect.annotateLogs({ error }),
      Effect.andThen(new UnableToQuery({ cause: error })),
    ),
  ),
)
