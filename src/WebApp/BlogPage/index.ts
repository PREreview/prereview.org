import { Effect } from 'effect'
import { CmsContent } from '../../CmsContent/index.ts'
import type { Locale } from '../../Context.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import type { PageResponse } from '../Response/index.ts'
import { createBlogPage } from './BlogPage.ts'

export const BlogPage: (query: { page: number }) => Effect.Effect<PageResponse, never, CmsContent | Locale> = Effect.fn(
  'BlogPage',
)(
  function* ({ page }) {
    const cmsContent = yield* CmsContent

    const blogPage = yield* cmsContent.getPageOfBlogPosts(page)

    return createBlogPage(blogPage)
  },
  Effect.catchTags({
    PageNotFound: () => PageNotFound,
    UnableToQuery: () => HavingProblemsPage,
  }),
)
