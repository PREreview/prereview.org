import type { Effect } from 'effect'
import type { Contentful } from '../../../ExternalApis/Contentful/index.ts'
import type { UnableToQuery } from '../../../Queries.ts'
import type { PageNotFound } from '../Errors.ts'
import type { ContentfulPageOfBlogPosts } from '../index.ts'

export declare const GetPageOfBlogPostsForTag: (
  tag: 'champions-program',
  page: number,
) => Effect.Effect<ContentfulPageOfBlogPosts, UnableToQuery | PageNotFound, Contentful>
