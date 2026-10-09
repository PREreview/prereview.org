import { Effect } from 'effect'
import { CmsContent } from '../../CmsContent/index.ts'
import type { Locale } from '../../Context.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import type { PageResponse } from '../Response/index.ts'
import { createWeeknotesPage } from './WeeknotesPage.ts'

export const WeeknotesPage: (query: { page: number }) => Effect.Effect<PageResponse, never, CmsContent | Locale> =
  Effect.fn('WeeknotesPage')(
    function* ({ page }) {
      const cmsContent = yield* CmsContent

      const blogPage = yield* cmsContent.getPageOfBlogPosts('weeknote', page)

      return createWeeknotesPage(blogPage)
    },
    Effect.catchTags({
      PageNotFound: () => PageNotFound,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )
