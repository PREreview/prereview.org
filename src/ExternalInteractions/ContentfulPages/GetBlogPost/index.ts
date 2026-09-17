import type { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type { Contentful } from '../../../ExternalApis/Contentful/index.ts'
import type { UnableToQuery } from '../../../Queries.ts'
import type { Slug } from '../../../types/Slug.ts'
import type { ContentfulBlogPost } from '../index.ts'

export declare const GetBlogPost: (
  slug: Slug,
  preview?: boolean,
) => Effect.Effect<ContentfulBlogPost, UnableToQuery, Contentful | Locale>
