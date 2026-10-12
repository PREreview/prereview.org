import { Effect } from 'effect'
import { CmsContent } from '../../CmsContent/index.ts'
import type { Locale } from '../../Context.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import type { PageResponse } from '../Response/index.ts'
import { createTagPage } from './TagPage.ts'

export const TagPage: (query: {
  tag: 'champions-program'
  page: number
}) => Effect.Effect<PageResponse, never, CmsContent | Locale> = Effect.fn('TagPage')(
  function* ({ tag, page }) {
    const cmsContent = yield* CmsContent

    const blogPage = yield* cmsContent.getPageOfBlogPostsForTag(tag, page)

    return createTagPage(blogPage)
  },
  Effect.catchTags({
    PageNotFound: () => PageNotFound,
    UnableToQuery: () => HavingProblemsPage,
  }),
)
