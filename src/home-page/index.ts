import { pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type { SupportedLocale } from '../locales/index.ts'
import type { PageResponse } from '../response.ts'
import { createPage } from './home-page.ts'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews.ts'
import { type GetRecentReviewRequestsEnv, getRecentReviewRequests } from './recent-review-requests.ts'

export { type RecentPrereview } from './recent-prereviews.ts'
export { type RecentReviewRequest } from './recent-review-requests.ts'

export const home = ({
  canReviewDatasets = false,
  locale,
}: {
  canReviewDatasets?: boolean
  locale: SupportedLocale
}): RT.ReaderTask<GetRecentPrereviewsEnv & GetRecentReviewRequestsEnv, PageResponse> =>
  pipe(
    RT.Do,
    RT.apS('recentPrereviews', getRecentPrereviews()),
    RT.apSW('recentReviewRequests', getRecentReviewRequests()),
    RT.let('statistics', () => ({ prereviews: 1332, servers: 30, users: 3670 })),
    RT.let('locale', () => locale),
    RT.let('canReviewDatasets', () => canReviewDatasets),
    RT.map(createPage),
  )
