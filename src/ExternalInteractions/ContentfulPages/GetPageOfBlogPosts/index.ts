import { Array, Effect, pipe } from 'effect'
import type { Locale } from '../../../Context.ts'
import { Contentful } from '../../../ExternalApis/Contentful/index.ts'
import { UnableToQuery } from '../../../Queries.ts'
import { PageNotFound } from '../Errors.ts'
import type { ContentfulPageOfBlogPosts } from '../index.ts'
import { EntryToContentfulBlogPostTitle } from './EntryToContentfulBlogPostTitle.ts'

export const GetPageOfBlogPosts: (
  page: number,
) => Effect.Effect<ContentfulPageOfBlogPosts, UnableToQuery | PageNotFound, Contentful | Locale> = Effect.fn(
  'ContentfulPages.getPageOfBlogPosts',
)(
  function* (page) {
    yield* Effect.annotateCurrentSpan({ page })

    const contentful = yield* Contentful

    const { items, total } = yield* contentful.getEntries({
      content_type: 'blogPost',
      limit: 5,
      skip: (page - 1) * 5,
      order: '-sys.createdAt',
    })

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
