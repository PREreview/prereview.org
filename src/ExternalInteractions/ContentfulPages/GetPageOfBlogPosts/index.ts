import type { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import { UnableToQuery } from '../../../Queries.ts'
import type { PageNotFound } from '../Errors.ts'
import type { ContentfulPageOfBlogPosts } from '../index.ts'

export const GetPageOfBlogPosts: (
  page: number,
) => Effect.Effect<ContentfulPageOfBlogPosts, UnableToQuery | PageNotFound, Locale> = () =>
  new UnableToQuery({ cause: 'not implemented' })
