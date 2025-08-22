import { pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type { SupportedLocale } from '../locales/index.js'
import type { PageResponse } from '../response.js'
import { createPage } from './home-page.js'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews.js'
import { type GetRecentReviewRequestsEnv, getRecentReviewRequests } from './recent-review-requests.js'

export { type RecentPrereview } from './recent-prereviews.js'
export { type RecentReviewRequest } from './recent-review-requests.js'

export const home = ({
  locale,
}: {
  locale: SupportedLocale
}): RT.ReaderTask<GetRecentPrereviewsEnv & GetRecentReviewRequestsEnv, PageResponse> =>
  pipe(
    RT.Do,
    RT.apS('recentPrereviews', getRecentPrereviews()),
    RT.apSW('recentReviewRequests', getRecentReviewRequests()),
    RT.let('statistics', () => ({ prereviews: 1237, servers: 30, users: 3453 })),
    RT.let('locale', () => locale),
    RT.map(createPage),
  )
