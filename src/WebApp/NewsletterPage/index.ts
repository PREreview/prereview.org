import { Effect } from 'effect'
import { CmsContent } from '../../CmsContent/index.ts'
import type { Locale } from '../../Context.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import type { PageResponse } from '../Response/index.ts'
import { createNewsletterPage } from './NewsletterPage.ts'

export const NewsletterPage: (query: { page: number }) => Effect.Effect<PageResponse, never, CmsContent | Locale> =
  Effect.fn('NewsletterPage')(
    function* ({ page }) {
      const cmsContent = yield* CmsContent

      const blogPage = yield* cmsContent.getPageOfBlogPosts('newsletter', page)

      return createNewsletterPage(blogPage)
    },
    Effect.catchTags({
      PageNotFound: () => PageNotFound,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )
